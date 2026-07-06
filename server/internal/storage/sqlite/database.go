package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/pressly/goose/v3"
	_ "modernc.org/sqlite"
)

const (
	driverName        = "sqlite"
	sqliteFilePerm    = 0o755
	sqliteDialectName = "sqlite3"
)

type Store struct {
	db *sql.DB
}

func Open(ctx context.Context, dbPath string, migrationsDir string) (*Store, error) {
	if err := os.MkdirAll(filepath.Dir(dbPath), sqliteFilePerm); err != nil {
		return nil, fmt.Errorf("create database directory: %w", err)
	}
	db, err := sql.Open(driverName, dbPath)
	if err != nil {
		return nil, fmt.Errorf("open sqlite database: %w", err)
	}
	store := &Store{db: db}
	if err := store.configure(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	if err := store.migrate(ctx, migrationsDir); err != nil {
		_ = db.Close()
		return nil, err
	}
	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) configure(ctx context.Context) error {
	statements := []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA journal_mode = WAL",
		"PRAGMA busy_timeout = 5000",
	}
	for _, statement := range statements {
		if _, err := s.db.ExecContext(ctx, statement); err != nil {
			return fmt.Errorf("configure sqlite: %w", err)
		}
	}
	return nil
}

func (s *Store) migrate(ctx context.Context, migrationsDir string) error {
	provider, err := goose.NewProvider(goose.Dialect(sqliteDialectName), s.db, os.DirFS(migrationsDir))
	if err != nil {
		return fmt.Errorf("prepare migrations: %w", err)
	}
	if _, err := provider.Up(ctx); err != nil {
		return fmt.Errorf("run migrations: %w", err)
	}
	return nil
}
