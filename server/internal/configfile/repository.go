package configfile

import (
	"context"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/profile"
)

type SourceRepository interface {
	GetConfigSource(ctx context.Context, id string) (agent.ConfigSource, error)
}

type ProfileRepository interface {
	GetProfile(ctx context.Context, id string) (profile.Profile, error)
}

type BackupRepository interface {
	CreateBackup(ctx context.Context, item backup.Backup) (backup.Backup, error)
	GetBackup(ctx context.Context, id string) (backup.Backup, error)
}

type ActiveProfileRepository interface {
	SetActiveProfile(ctx context.Context, sourceID string, profileID string) error
}
