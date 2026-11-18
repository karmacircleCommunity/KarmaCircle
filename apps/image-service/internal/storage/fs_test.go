package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"testing"
)

func TestFSRoundTrip(t *testing.T) {
	store, err := NewFS(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := store.Put(ctx, "images/abc/card.jpg", []byte("pixels"), "image/jpeg"); err != nil {
		t.Fatal(err)
	}
	object, size, err := store.Get(ctx, "images/abc/card.jpg")
	if err != nil {
		t.Fatal(err)
	}
	defer object.Close()
	data, _ := io.ReadAll(object)
	if string(data) != "pixels" || size != 6 {
		t.Fatalf("got %q size %d", data, size)
	}
}

func TestFSMissingObject(t *testing.T) {
	store, _ := NewFS(t.TempDir())
	if _, _, err := store.Get(context.Background(), "images/none/card.jpg"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("got %v, want ErrNotFound", err)
	}
}

func TestFSRefusesKeysThatLeaveTheFolder(t *testing.T) {
	parent := t.TempDir()
	root := filepath.Join(parent, "store")
	store, err := NewFS(root)
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(parent, "secret.txt"), []byte("outside"), 0o600); err != nil {
		t.Fatal(err)
	}
	for _, key := range []string{"../secret.txt", "images/../../secret.txt", "/etc/passwd", "", "a\x00b"} {
		if err := store.Put(context.Background(), key, []byte("x"), ""); err == nil {
			t.Errorf("Put accepted %q", key)
		}
		if _, _, err := store.Get(context.Background(), key); !errors.Is(err, ErrNotFound) {
			t.Errorf("Get(%q) = %v, want ErrNotFound", key, err)
		}
	}
	if data, _ := os.ReadFile(filepath.Join(parent, "secret.txt")); string(data) != "outside" {
		t.Error("a file outside the store was changed")
	}
}

func TestFSPing(t *testing.T) {
	store, _ := NewFS(t.TempDir())
	if err := store.Ping(context.Background()); err != nil {
		t.Fatal(err)
	}
}
