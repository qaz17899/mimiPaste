package app

import (
	"context"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/configfile"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
	"github.com/qaz17899/mimiPaste/server/internal/platform/filesystem"
	"github.com/qaz17899/mimiPaste/server/internal/profile"
	"github.com/qaz17899/mimiPaste/server/internal/prompt"
	"github.com/qaz17899/mimiPaste/server/internal/settings"
	"github.com/qaz17899/mimiPaste/server/internal/storage/sqlite"
)

const originalProfileName = "原本配置"

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
	fs := filesystem.OSFileSystem{}
	agentService := agent.NewService(store, clock)
	profileService := profile.NewService(store, clock)
	backupService := backup.NewService(store)
	configService := configfile.NewService(store, store, store, store, fs, clock)
	if err := agentService.EnsureBuiltIns(ctx); err != nil {
		_ = store.Close()
		return nil, err
	}
	if err := store.EnsureDefaultSettings(ctx, cfg.BackupDir, clock.Now()); err != nil {
		_ = store.Close()
		return nil, err
	}
	if err := ensureOriginalProfiles(ctx, store, profileService, fs, clock); err != nil {
		_ = store.Close()
		return nil, err
	}
	return &Services{
		Agents: agentService, Backups: backupService, Clock: clock, Config: configService,
		Profiles: profileService, Prompts: prompt.NewService(store, clock),
		Settings: &cfg, Store: store,
	}, nil
}

func ensureOriginalProfiles(
	ctx context.Context,
	store *sqlite.Store,
	profiles *profile.Service,
	fs filesystem.FileSystem,
	clock clock.Clock,
) error {
	sources, err := configfile.DiscoverDefaultSources(fs)
	if err != nil {
		return err
	}
	for _, source := range sources {
		if err := ensureOriginalProfile(ctx, store, profiles, source, clock); err != nil {
			return err
		}
	}
	return nil
}

func ensureOriginalProfile(
	ctx context.Context,
	store *sqlite.Store,
	profiles *profile.Service,
	source configfile.DefaultSource,
	clock clock.Clock,
) error {
	now := clock.Now()
	configSource, err := store.EnsureConfigSource(ctx, agent.ConfigSource{
		ID: core.NewID(), AgentID: source.AgentID, Name: source.Name,
		Path: source.Path, Format: source.Format, CreatedAt: now, UpdatedAt: now,
	})
	if err != nil {
		return err
	}
	original, err := profiles.EnsureOriginal(ctx, profile.SaveInput{
		AgentID: source.AgentID, Name: originalProfileName, Description: source.Name,
		Format: source.Format, Content: source.Content,
	})
	if err != nil {
		return err
	}
	return ensureOriginalActiveProfile(ctx, store, configSource, original)
}

func ensureOriginalActiveProfile(
	ctx context.Context,
	store *sqlite.Store,
	source agent.ConfigSource,
	original profile.Profile,
) error {
	if source.ActiveProfileID == nil {
		return store.SetActiveProfile(ctx, source.ID, original.ID)
	}
	if *source.ActiveProfileID == original.ID {
		return nil
	}
	active, err := store.GetProfile(ctx, *source.ActiveProfileID)
	if err != nil {
		return err
	}
	if active.Name == originalProfileName && active.Description != original.Description {
		return store.SetActiveProfile(ctx, source.ID, original.ID)
	}
	return nil
}
