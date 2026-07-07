package filesystem

import (
	"os"
	"path/filepath"
)

type FileInfo = os.FileInfo

type FileSystem interface {
	MkdirAll(path string, perm os.FileMode) error
	ReadFile(path string) ([]byte, error)
	Remove(path string) error
	Stat(path string) (FileInfo, error)
	WriteFile(path string, data []byte, perm os.FileMode) error
}

type OSFileSystem struct{}

func (OSFileSystem) MkdirAll(path string, perm os.FileMode) error {
	return os.MkdirAll(path, perm)
}

func (OSFileSystem) ReadFile(path string) ([]byte, error) {
	return os.ReadFile(filepath.Clean(path))
}

func (OSFileSystem) Remove(path string) error {
	return os.Remove(filepath.Clean(path))
}

func (OSFileSystem) Stat(path string) (FileInfo, error) {
	return os.Stat(filepath.Clean(path))
}

func (OSFileSystem) WriteFile(path string, data []byte, perm os.FileMode) error {
	return os.WriteFile(filepath.Clean(path), data, perm)
}
