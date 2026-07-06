package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/core"
)

func (s *Store) ListBackups(ctx context.Context) ([]backup.Backup, error) {
	rows, err := s.db.QueryContext(ctx, backupBaseQuery()+" ORDER BY cb.created_at DESC")
	if err != nil {
		return nil, fmt.Errorf("list backups: %w", err)
	}
	defer rows.Close()
	return scanBackups(rows)
}

func (s *Store) GetBackup(ctx context.Context, id string) (backup.Backup, error) {
	row := s.db.QueryRowContext(ctx, backupBaseQuery()+" WHERE cb.id = ?", id)
	item, err := scanBackup(row)
	if err != nil {
		return backup.Backup{}, mapBackupError(err)
	}
	return item, nil
}

func (s *Store) CreateBackup(ctx context.Context, item backup.Backup) (backup.Backup, error) {
	query := `
		INSERT INTO config_backups (id, config_source_id, profile_id, path, content, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, item.ID, item.ConfigSourceID,
		item.ProfileID, item.Path, item.Content, sqlTime(item.CreatedAt))
	if err != nil {
		return backup.Backup{}, fmt.Errorf("create backup: %w", err)
	}
	return s.GetBackup(ctx, item.ID)
}

func backupBaseQuery() string {
	return `
		SELECT cb.id, cb.config_source_id, cs.name, a.name, cb.profile_id,
			p.name, cb.path, cb.content, cb.created_at
		FROM config_backups cb
		JOIN config_sources cs ON cs.id = cb.config_source_id
		JOIN agents a ON a.id = cs.agent_id
		LEFT JOIN profiles p ON p.id = cb.profile_id`
}

func scanBackups(rows *sql.Rows) ([]backup.Backup, error) {
	items := []backup.Backup{}
	for rows.Next() {
		item, err := scanBackup(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanBackup(row rowScanner) (backup.Backup, error) {
	var item backup.Backup
	var profileID, profileName sql.NullString
	var createdAt string
	err := row.Scan(&item.ID, &item.ConfigSourceID, &item.ConfigSourceName,
		&item.AgentName, &profileID, &profileName, &item.Path, &item.Content, &createdAt)
	item.ProfileID = stringPointer(profileID)
	item.ProfileName = stringPointer(profileName)
	item.CreatedAt = parseTime(createdAt)
	return item, err
}

func mapBackupError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return core.NewError(core.CodeNotFound, "找不到備份。")
	}
	return fmt.Errorf("read backup: %w", err)
}
