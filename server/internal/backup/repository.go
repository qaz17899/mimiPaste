package backup

import "context"

type Repository interface {
	CreateBackup(ctx context.Context, item Backup) (Backup, error)
	DeleteBackup(ctx context.Context, id string) error
	GetBackup(ctx context.Context, id string) (Backup, error)
	ListBackups(ctx context.Context) ([]Backup, error)
	UpdateBackupPinned(ctx context.Context, id string, pinned bool) (Backup, error)
	UpdateBackupContentPath(ctx context.Context, id string, contentPath string) (Backup, error)
}

type SettingsRepository interface {
	GetBackupDir(ctx context.Context) (string, error)
}
