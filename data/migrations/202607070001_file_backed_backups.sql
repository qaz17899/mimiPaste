-- +goose Up
ALTER TABLE config_backups ADD COLUMN content_path TEXT NOT NULL DEFAULT '';
ALTER TABLE config_backups ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;

-- +goose Down
ALTER TABLE config_backups DROP COLUMN pinned;
ALTER TABLE config_backups DROP COLUMN content_path;
