package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/qaz17899/mimiPaste/server/internal/configfile"
	"github.com/qaz17899/mimiPaste/server/internal/core"
)

func (s *Store) CreateOperation(
	ctx context.Context,
	item configfile.Operation,
) (configfile.Operation, error) {
	query := `
		INSERT INTO config_operations (
			id, kind, status, config_source_id, profile_id, backup_id,
			error_code, error_detail, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, item.ID, item.Kind, item.Status,
		item.ConfigSourceID, item.ProfileID, item.BackupID, item.ErrorCode,
		item.ErrorDetail, sqlTime(item.CreatedAt), sqlTime(item.UpdatedAt))
	if err != nil {
		return configfile.Operation{}, fmt.Errorf("create config operation: %w", err)
	}
	return s.GetOperation(ctx, item.ID)
}

func (s *Store) UpdateOperation(
	ctx context.Context,
	item configfile.Operation,
) (configfile.Operation, error) {
	query := `
		UPDATE config_operations
		SET status = ?, backup_id = ?, error_code = ?, error_detail = ?, updated_at = ?
		WHERE id = ?`
	result, err := s.db.ExecContext(ctx, query, item.Status, item.BackupID,
		item.ErrorCode, item.ErrorDetail, sqlTime(item.UpdatedAt), item.ID)
	if err != nil {
		return configfile.Operation{}, fmt.Errorf("update config operation: %w", err)
	}
	if err := requireAffected(result, "找不到操作紀錄。"); err != nil {
		return configfile.Operation{}, err
	}
	return s.GetOperation(ctx, item.ID)
}

func (s *Store) GetOperation(ctx context.Context, id string) (configfile.Operation, error) {
	row := s.db.QueryRowContext(ctx, operationBaseQuery()+" WHERE id = ?", id)
	item, err := scanOperation(row)
	if err != nil {
		return configfile.Operation{}, mapOperationError(err)
	}
	return item, nil
}

func operationBaseQuery() string {
	return `
		SELECT id, kind, status, config_source_id, profile_id, backup_id,
			error_code, error_detail, created_at, updated_at
		FROM config_operations`
}

func scanOperation(row rowScanner) (configfile.Operation, error) {
	var item configfile.Operation
	var profileID, backupID sql.NullString
	var createdAt, updatedAt string
	err := row.Scan(&item.ID, &item.Kind, &item.Status, &item.ConfigSourceID,
		&profileID, &backupID, &item.ErrorCode, &item.ErrorDetail,
		&createdAt, &updatedAt)
	item.ProfileID = stringPointer(profileID)
	item.BackupID = stringPointer(backupID)
	item.CreatedAt = parseTime(createdAt)
	item.UpdatedAt = parseTime(updatedAt)
	return item, err
}

func mapOperationError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return core.NewError(core.CodeNotFound, "找不到操作紀錄。")
	}
	return fmt.Errorf("read config operation: %w", err)
}
