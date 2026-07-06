package backup

import "context"

type Repository interface {
	CreateBackup(ctx context.Context, item Backup) (Backup, error)
	GetBackup(ctx context.Context, id string) (Backup, error)
	ListBackups(ctx context.Context) ([]Backup, error)
}
