// Package imageproc checks an uploaded picture and turns it into the sizes
// the site shows.
//
// Every output is a freshly encoded JPEG. Re-encoding drops all metadata, so
// the GPS position and camera details a phone writes into a photo never reach
// the public copies. It also means a file that only pretends to be an image
// cannot be stored as one.
package imageproc

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"

	// Decoders. Registering them is what lets image.DecodeConfig and
	// imaging.Decode recognise these formats by their first bytes, whatever
	// the upload claims to be.
	_ "image/gif"
	_ "image/png"

	"github.com/disintegration/imaging"
	_ "golang.org/x/image/webp"
	"golang.org/x/sync/errgroup"
)

// Variant is one size the site asks for.
type Variant struct {
	Name  string
	Width int
}

// Variants are the sizes produced for every upload, narrowest first.
var Variants = []Variant{
	{Name: "thumb", Width: 400},
	{Name: "card", Width: 800},
	{Name: "large", Width: 1600},
}

const jpegQuality = 82

// Reasons an upload is refused. The server turns each into a clear answer.
var (
	ErrNotImage       = errors.New("the file is not an image")
	ErrUnsupported    = errors.New("only JPEG, PNG, GIF and WebP images are accepted")
	ErrTooManyPixels  = errors.New("the image has too many pixels")
	ErrCorrupt        = errors.New("the image could not be read")
	ErrEmptyDimension = errors.New("the image has no size")
)

// Source describes the uploaded image.
type Source struct {
	Format string
	Width  int
	Height int
}

// Output is one finished size.
type Output struct {
	Name   string
	Data   []byte
	Width  int
	Height int
}

// Inspect reads only the header of the image, which is cheap, and refuses
// anything that is not a supported picture or would need too much memory to
// open. This runs before the full decode so a small file that claims to be
// enormous (a decompression bomb) never gets that far.
func Inspect(data []byte, maxPixels int) (Source, error) {
	config, format, err := image.DecodeConfig(bytes.NewReader(data))
	if err != nil {
		if errors.Is(err, image.ErrFormat) {
			return Source{}, ErrNotImage
		}
		return Source{}, fmt.Errorf("%w: %v", ErrCorrupt, err)
	}
	switch format {
	case "jpeg", "png", "gif", "webp":
	default:
		return Source{}, ErrUnsupported
	}
	if config.Width <= 0 || config.Height <= 0 {
		return Source{}, ErrEmptyDimension
	}
	if int64(config.Width)*int64(config.Height) > int64(maxPixels) {
		return Source{}, ErrTooManyPixels
	}
	return Source{Format: format, Width: config.Width, Height: config.Height}, nil
}

// Process validates the upload and produces every size. The variants are
// resized and encoded in parallel.
func Process(ctx context.Context, data []byte, maxPixels int) (Source, []Output, error) {
	source, err := Inspect(data, maxPixels)
	if err != nil {
		return Source{}, nil, err
	}

	// AutoOrientation turns a photo the way its EXIF orientation says, so a
	// portrait photo taken on a phone is not stored on its side.
	decoded, err := imaging.Decode(bytes.NewReader(data), imaging.AutoOrientation(true))
	if err != nil {
		return Source{}, nil, fmt.Errorf("%w: %v", ErrCorrupt, err)
	}
	opaque := flatten(decoded)
	source.Width, source.Height = opaque.Bounds().Dx(), opaque.Bounds().Dy()

	outputs := make([]Output, len(Variants))
	group, groupCtx := errgroup.WithContext(ctx)
	for i, variant := range Variants {
		group.Go(func() error {
			if err := groupCtx.Err(); err != nil {
				return err
			}
			out, err := render(opaque, variant)
			if err != nil {
				return err
			}
			outputs[i] = out
			return nil
		})
	}
	if err := group.Wait(); err != nil {
		return Source{}, nil, err
	}
	return source, outputs, nil
}

func render(src image.Image, variant Variant) (Output, error) {
	width := variant.Width
	// Never enlarge: a small original stays as sharp as it was.
	if src.Bounds().Dx() < width {
		width = src.Bounds().Dx()
	}
	resized := imaging.Resize(src, width, 0, imaging.Lanczos)

	var buffer bytes.Buffer
	if err := jpeg.Encode(&buffer, resized, &jpeg.Options{Quality: jpegQuality}); err != nil {
		return Output{}, fmt.Errorf("encode %s: %w", variant.Name, err)
	}
	return Output{
		Name:   variant.Name,
		Data:   buffer.Bytes(),
		Width:  resized.Bounds().Dx(),
		Height: resized.Bounds().Dy(),
	}, nil
}

// flatten puts the picture on a white background. JPEG has no transparency,
// and without this the clear parts of a PNG would turn black.
func flatten(src image.Image) image.Image {
	background := imaging.New(src.Bounds().Dx(), src.Bounds().Dy(), color.White)
	return imaging.Overlay(background, src, image.Pt(0, 0), 1)
}
