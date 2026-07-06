package agent

import (
	"context"
	"time"
)

type Repository interface {
	CreateAgent(ctx context.Context, item Agent) (Agent, error)
	CreateConfigSource(ctx context.Context, item ConfigSource) (ConfigSource, error)
	EnsureBuiltInAgent(ctx context.Context, item Agent) error
	GetConfigSource(ctx context.Context, id string) (ConfigSource, error)
	ListAgents(ctx context.Context) ([]Agent, error)
	ListConfigSources(ctx context.Context) ([]ConfigSource, error)
}

type SettingsRepository interface {
	EnsureDefaultSettings(ctx context.Context, backupDir string, now time.Time) error
}
