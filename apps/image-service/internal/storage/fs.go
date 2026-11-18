package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

// FS keeps objects as files under one folder. For development without Docker.
type FS struct {
	root string
}

// NewFS creates the folder if needed.
func NewFS(root string) (*FS, error) {
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, err
	}
	if err := os.MkdirAll(abs, 0o755); err != nil {
		return nil, err
	}
	return &FS{root: abs}, nil
}

// path turns a key into a file path and refuses anything that would leave the
// folder. The server builds keys from checked values, and this is the second
// lock on the same door.
func (f *FS) path(key string) (string, error) {
	if key == "" || strings.Contains(key, "..") || strings.ContainsRune(key, 0) || filepath.IsAbs(key) {
		return "", fmt.Errorf("invalid key %q", key)
	}
	full := filepath.Join(f.root, filepath.FromSlash(key))
	if !strings.HasPrefix(full, f.root+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid key %q", key)
	}
	return full, nil
}

func (f *FS) Put(_ context.Context, key string, data []byte, _ string) error {
	full, err := f.path(key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(full), 0o755); err != nil {
		return err
	}
	// Write beside the target and rename, so a reader never sees half a file.
	tmp, err := os.CreateTemp(filepath.Dir(full), ".upload-*")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmp.Name(), full)
}

func (f *FS) Get(_ context.Context, key string) (io.ReadCloser, int64, error) {
	full, err := f.path(key)
	if err != nil {
		return nil, 0, ErrNotFound
	}
	file, err := os.Open(full)
	if errors.Is(err, os.ErrNotExist) {
		return nil, 0, ErrNotFound
	}
	if err != nil {
		return nil, 0, err
	}
	info, err := file.Stat()
	if err != nil {
		file.Close()
		return nil, 0, err
	}
	return file, info.Size(), nil
}

func (f *FS) Ping(context.Context) error {
	probe, err := os.CreateTemp(f.root, ".ping-*")
	if err != nil {
		return err
	}
	probe.Close()
	return os.Remove(probe.Name())
}
