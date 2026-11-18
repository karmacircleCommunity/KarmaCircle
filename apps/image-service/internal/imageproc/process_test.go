package imageproc

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/binary"
	"image"
	"image/color"
	"image/gif"
	"image/jpeg"
	"image/png"
	"strings"
	"testing"
)

func gradient(w, h int) *image.NRGBA {
	img := image.NewNRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.NRGBA{R: uint8(x * 255 / w), G: uint8(y * 255 / h), B: 120, A: 255})
		}
	}
	return img
}

func encodeJPEG(t *testing.T, img image.Image) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := jpeg.Encode(&b, img, nil); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

func encodePNG(t *testing.T, img image.Image) []byte {
	t.Helper()
	var b bytes.Buffer
	if err := png.Encode(&b, img); err != nil {
		t.Fatal(err)
	}
	return b.Bytes()
}

// withOrientation inserts an EXIF block that holds one tag, the orientation,
// right after the JPEG start marker, the way a phone does.
func withOrientation(t *testing.T, jpegData []byte, orientation uint16) []byte {
	t.Helper()
	var tiff bytes.Buffer
	tiff.WriteString("MM")
	binary.Write(&tiff, binary.BigEndian, uint16(42))
	binary.Write(&tiff, binary.BigEndian, uint32(8))
	binary.Write(&tiff, binary.BigEndian, uint16(1))      // one entry
	binary.Write(&tiff, binary.BigEndian, uint16(0x0112)) // orientation
	binary.Write(&tiff, binary.BigEndian, uint16(3))      // SHORT
	binary.Write(&tiff, binary.BigEndian, uint32(1))
	binary.Write(&tiff, binary.BigEndian, orientation)
	binary.Write(&tiff, binary.BigEndian, uint16(0))
	binary.Write(&tiff, binary.BigEndian, uint32(0)) // no next IFD

	payload := append([]byte("Exif\x00\x00"), tiff.Bytes()...)
	segment := []byte{0xFF, 0xE1}
	segment = binary.BigEndian.AppendUint16(segment, uint16(len(payload)+2))
	segment = append(segment, payload...)

	out := append([]byte{}, jpegData[:2]...)
	out = append(out, segment...)
	return append(out, jpegData[2:]...)
}

func TestVariantsAreResizedAndNeverEnlarged(t *testing.T) {
	source, outputs, err := Process(context.Background(), encodeJPEG(t, gradient(2000, 1000)), 40_000_000)
	if err != nil {
		t.Fatal(err)
	}
	if source.Format != "jpeg" || source.Width != 2000 || source.Height != 1000 {
		t.Fatalf("unexpected source %+v", source)
	}
	want := map[string][2]int{"thumb": {400, 200}, "card": {800, 400}, "large": {1600, 800}}
	if len(outputs) != len(want) {
		t.Fatalf("got %d outputs", len(outputs))
	}
	for _, out := range outputs {
		if got := [2]int{out.Width, out.Height}; got != want[out.Name] {
			t.Errorf("%s is %v, want %v", out.Name, got, want[out.Name])
		}
		decoded, err := jpeg.Decode(bytes.NewReader(out.Data))
		if err != nil {
			t.Fatalf("%s is not a JPEG: %v", out.Name, err)
		}
		if decoded.Bounds().Dx() != out.Width {
			t.Errorf("%s reports width %d but is %d", out.Name, out.Width, decoded.Bounds().Dx())
		}
	}
}

func TestSmallImageIsKeptAtItsOwnSize(t *testing.T) {
	_, outputs, err := Process(context.Background(), encodePNG(t, gradient(300, 150)), 40_000_000)
	if err != nil {
		t.Fatal(err)
	}
	for _, out := range outputs {
		if out.Width != 300 || out.Height != 150 {
			t.Errorf("%s is %dx%d, want 300x150 (no enlarging)", out.Name, out.Width, out.Height)
		}
	}
}

func TestAcceptsEverySupportedFormat(t *testing.T) {
	var g bytes.Buffer
	if err := gif.Encode(&g, gradient(60, 40), nil); err != nil {
		t.Fatal(err)
	}
	webpData, err := base64.StdEncoding.DecodeString("UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA")
	if err != nil {
		t.Fatal(err)
	}
	cases := map[string][]byte{
		"jpeg": encodeJPEG(t, gradient(60, 40)),
		"png":  encodePNG(t, gradient(60, 40)),
		"gif":  g.Bytes(),
		"webp": webpData,
	}
	for format, data := range cases {
		source, outputs, err := Process(context.Background(), data, 1_000_000)
		if err != nil {
			t.Errorf("%s: %v", format, err)
			continue
		}
		if source.Format != format || len(outputs) != len(Variants) {
			t.Errorf("%s: got %+v with %d outputs", format, source, len(outputs))
		}
	}
}

func TestRefusesWhatIsNotAPicture(t *testing.T) {
	cases := map[string][]byte{
		"text":       []byte("just some words, not a picture"),
		"empty":      {},
		"html":       []byte("<html><script>alert(1)</script></html>"),
		"pdf header": []byte("%PDF-1.7\n1 0 obj\n"),
		"svg":        []byte(`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>`),
	}
	for name, data := range cases {
		if _, _, err := Process(context.Background(), data, 1_000_000); err != ErrNotImage {
			t.Errorf("%s: got %v, want ErrNotImage", name, err)
		}
	}
}

func TestRefusesAnImagePretendingByName(t *testing.T) {
	// Real image bytes with a wrong claim elsewhere are fine; only the bytes
	// decide. A PNG signature followed by junk is not an image.
	data := append([]byte("\x89PNG\r\n\x1a\n"), []byte(strings.Repeat("x", 64))...)
	if _, _, err := Process(context.Background(), data, 1_000_000); err == nil {
		t.Fatal("expected an error for a broken PNG")
	}
}

func TestRefusesTooManyPixelsBeforeDecoding(t *testing.T) {
	data := encodePNG(t, gradient(500, 400)) // 200,000 pixels
	if _, err := Inspect(data, 100_000); err != ErrTooManyPixels {
		t.Fatalf("got %v, want ErrTooManyPixels", err)
	}
	if _, err := Inspect(data, 200_000); err != nil {
		t.Fatalf("exactly at the limit should pass, got %v", err)
	}
}

func TestPortraitPhotoIsTurnedUpright(t *testing.T) {
	// Stored 80 wide by 40 tall with orientation 6 ("rotate 90 degrees"),
	// which is how a portrait photo comes off a phone.
	data := withOrientation(t, encodeJPEG(t, gradient(80, 40)), 6)
	source, outputs, err := Process(context.Background(), data, 1_000_000)
	if err != nil {
		t.Fatal(err)
	}
	if source.Width != 40 || source.Height != 80 {
		t.Fatalf("source is %dx%d, want 40x80 after turning", source.Width, source.Height)
	}
	for _, out := range outputs {
		if out.Height <= out.Width {
			t.Errorf("%s is %dx%d, expected taller than wide", out.Name, out.Width, out.Height)
		}
	}
}

func TestMetadataDoesNotSurvive(t *testing.T) {
	data := withOrientation(t, encodeJPEG(t, gradient(80, 40)), 1)
	if !bytes.Contains(data, []byte("Exif")) {
		t.Fatal("test setup: input has no EXIF block")
	}
	_, outputs, err := Process(context.Background(), data, 1_000_000)
	if err != nil {
		t.Fatal(err)
	}
	for _, out := range outputs {
		if bytes.Contains(out.Data, []byte("Exif")) {
			t.Errorf("%s still carries an EXIF block", out.Name)
		}
	}
}

func TestTransparentPixelsBecomeWhiteNotBlack(t *testing.T) {
	clear := image.NewNRGBA(image.Rect(0, 0, 40, 40)) // all fully transparent
	_, outputs, err := Process(context.Background(), encodePNG(t, clear), 1_000_000)
	if err != nil {
		t.Fatal(err)
	}
	decoded, err := jpeg.Decode(bytes.NewReader(outputs[0].Data))
	if err != nil {
		t.Fatal(err)
	}
	r, g, b, _ := decoded.At(10, 10).RGBA()
	if r>>8 < 240 || g>>8 < 240 || b>>8 < 240 {
		t.Errorf("clear pixel became rgb(%d,%d,%d), want near white", r>>8, g>>8, b>>8)
	}
}

func TestCancelledContextStopsWork(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, _, err := Process(ctx, encodeJPEG(t, gradient(200, 100)), 1_000_000); err == nil {
		t.Fatal("expected an error for a cancelled context")
	}
}
