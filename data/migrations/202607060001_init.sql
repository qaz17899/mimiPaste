-- +goose Up
CREATE TABLE prompts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_copied_at TEXT NULL,
  copy_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NULL
);

CREATE TABLE prompt_tags (
  prompt_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (prompt_id, tag_id),
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE config_sources (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  format TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE active_profiles (
  config_source_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  applied_at TEXT NOT NULL,
  FOREIGN KEY (config_source_id) REFERENCES config_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE TABLE config_backups (
  id TEXT PRIMARY KEY,
  config_source_id TEXT NOT NULL,
  profile_id TEXT NULL,
  path TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (config_source_id) REFERENCES config_sources(id) ON DELETE CASCADE,
  FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE TABLE prompt_usage_events (
  id TEXT PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (prompt_id) REFERENCES prompts(id) ON DELETE CASCADE
);

CREATE VIRTUAL TABLE prompt_fts USING fts5(
  prompt_id UNINDEXED,
  title,
  content,
  description,
  tags
);

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_prompt_tags_tag_id ON prompt_tags(tag_id);
CREATE INDEX idx_config_sources_agent_id ON config_sources(agent_id);
CREATE INDEX idx_profiles_agent_id ON profiles(agent_id);
CREATE INDEX idx_config_backups_source_id ON config_backups(config_source_id);
CREATE INDEX idx_prompt_usage_prompt_id ON prompt_usage_events(prompt_id);

-- +goose Down
DROP TABLE IF EXISTS app_settings;
DROP TABLE IF EXISTS prompt_fts;
DROP TABLE IF EXISTS prompt_usage_events;
DROP TABLE IF EXISTS config_backups;
DROP TABLE IF EXISTS active_profiles;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS config_sources;
DROP TABLE IF EXISTS agents;
DROP TABLE IF EXISTS prompt_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS prompts;
