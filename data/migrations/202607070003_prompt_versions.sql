-- +goose Up
CREATE TABLE prompt_versions (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags_json TEXT NOT NULL DEFAULT '[]',
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
  UNIQUE (prompt_id, version)
);

CREATE INDEX idx_prompt_versions_prompt_id_created_at
  ON prompt_versions(prompt_id, created_at DESC);

-- +goose Down
DROP TABLE IF EXISTS prompt_versions;
