package app

import (
	"context"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/configfile"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
	"github.com/qaz17899/mimiPaste/server/internal/platform/filesystem"
	"github.com/qaz17899/mimiPaste/server/internal/profile"
	"github.com/qaz17899/mimiPaste/server/internal/prompt"
	"github.com/qaz17899/mimiPaste/server/internal/settings"
	"github.com/qaz17899/mimiPaste/server/internal/storage/sqlite"
)

type Services struct {
	Agents   *agent.Service
	Backups  *backup.Service
	Clock    clock.Clock
	Config   *configfile.Service
	Profiles *profile.Service
	Prompts  *prompt.Service
	Settings *settings.Config
	Store    *sqlite.Store
}

func New(ctx context.Context, cfg settings.Config) (*Services, error) {
	store, err := sqlite.Open(ctx, cfg.DBPath, cfg.MigrationsDir)
	if err != nil {
		return nil, err
	}
	clock := clock.RealClock{}
	agentService := agent.NewService(store, clock)
	profileService := profile.NewService(store, clock)
	backupService := backup.NewService(store)
	configService := configfile.NewService(store, store, store, store, filesystem.OSFileSystem{}, clock)
	if err := agentService.EnsureBuiltIns(ctx); err != nil {
		_ = store.Close()
		return nil, err
	}
	if err := store.EnsureDefaultSettings(ctx, cfg.BackupDir, clock.Now()); err != nil {
		_ = store.Close()
		return nil, err
	}
	return &Services{
		Agents: agentService, Backups: backupService, Clock: clock, Config: configService,
		Profiles: profileService, Prompts: prompt.NewService(store, clock),
		Settings: &cfg, Store: store,
	}, nil
}
