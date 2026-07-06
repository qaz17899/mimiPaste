package sqlite

import (
	"context"
	"fmt"
	"time"
)

const backupDirSettingKey = "backup_dir"

type AppSettings struct {
	BackupDir string `json:"backup_dir"`
}

func (s *Store) EnsureDefaultSettings(ctx context.Context, backupDir string, now time.Time) error {
	query := "INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)"
	_, err := s.db.ExecContext(ctx, query, backupDirSettingKey, backupDir, sqlTime(now))
	if err != nil {
		return fmt.Errorf("seed app settings: %w", err)
	}
	return nil
}

func (s *Store) GetAppSettings(ctx context.Context) (AppSettings, error) {
	var settings AppSettings
	err := s.db.QueryRowContext(ctx, "SELECT value FROM app_settings WHERE key = ?", backupDirSettingKey).
		Scan(&settings.BackupDir)
	if err != nil {
		return AppSettings{}, fmt.Errorf("read app settings: %w", err)
	}
	return settings, nil
}

func (s *Store) UpdateBackupDir(ctx context.Context, backupDir string, now time.Time) error {
	query := "UPDATE app_settings SET value = ?, updated_at = ? WHERE key = ?"
	_, err := s.db.ExecContext(ctx, query, backupDir, sqlTime(now), backupDirSettingKey)
	if err != nil {
		return fmt.Errorf("update backup directory: %w", err)
	}
	return nil
}

func (s *Store) SetActiveProfile(ctx context.Context, sourceID string, profileID string) error {
	query := `
		INSERT INTO active_profiles (config_source_id, profile_id, applied_at)
		VALUES (?, ?, datetime('now'))
		ON CONFLICT(config_source_id) DO UPDATE SET
			profile_id = excluded.profile_id,
			applied_at = excluded.applied_at`
	_, err := s.db.ExecContext(ctx, query, sourceID, profileID)
	if err != nil {
		return fmt.Errorf("set active profile: %w", err)
	}
	return nil
}
