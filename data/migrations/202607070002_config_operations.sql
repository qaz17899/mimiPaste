-- +goose Up
CREATE TABLE config_operations (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('apply', 'restore')),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  config_source_id TEXT NOT NULL,
  profile_id TEXT NULL,
  backup_id TEXT NULL,
  error_code TEXT NOT NULL DEFAULT '',
  error_detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (config_source_id) REFERENCES config_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL,
  FOREIGN KEY (backup_id) REFERENCES config_backups(id) ON DELETE SET NULL
);

CREATE INDEX idx_config_operations_source_id ON config_operations(config_source_id);
CREATE INDEX idx_config_operations_backup_id ON config_operations(backup_id);

-- +goose Down
DROP TABLE IF EXISTS config_operations;
