// Package storage keeps the finished images. The server only knows the Store
// interface, so a laptop can use a folder, tests can use memory and
// production can use any S3 compatible bucket.
package storage

import (
	"context"
	"errors"
	"io"
)

// ErrNotFound means there is no object under the key.
var ErrNotFound = errors.New("object not found")

// Store is a place to put and read finished images.
type Store interface {
	// Put stores data under key, replacing anything already there.
	Put(ctx context.Context, key string, data []byte, contentType string) error
	// Get returns the object and its size. The caller closes the reader.
	Get(ctx context.Context, key string) (io.ReadCloser, int64, error)
	// Ping reports whether the store can be used right now.
	Ping(ctx context.Context) error
}
