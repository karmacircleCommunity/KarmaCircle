package storage

import (
	"bytes"
	"context"
	"io"
	"sync"
)

// Memory keeps objects in a map. For tests.
type Memory struct {
	mu      sync.Mutex
	objects map[string][]byte
	types   map[string]string

	// FailPut makes Put return this error, to test the failure path.
	FailPut error
}

// NewMemory returns an empty in-memory store.
func NewMemory() *Memory {
	return &Memory{objects: map[string][]byte{}, types: map[string]string{}}
}

func (m *Memory) Put(_ context.Context, key string, data []byte, contentType string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.FailPut != nil {
		return m.FailPut
	}
	m.objects[key] = append([]byte(nil), data...)
	m.types[key] = contentType
	return nil
}

func (m *Memory) Get(_ context.Context, key string) (io.ReadCloser, int64, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	data, ok := m.objects[key]
	if !ok {
		return nil, 0, ErrNotFound
	}
	return io.NopCloser(bytes.NewReader(data)), int64(len(data)), nil
}

func (m *Memory) Ping(context.Context) error { return nil }

// Keys lists what is stored. For assertions in tests.
func (m *Memory) Keys() []string {
	m.mu.Lock()
	defer m.mu.Unlock()
	keys := make([]string, 0, len(m.objects))
	for key := range m.objects {
		keys = append(keys, key)
	}
	return keys
}
