package sqlite

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/prompt"
)

func (s *Store) ListVersions(ctx context.Context, promptID string) ([]prompt.Version, error) {
	if _, err := s.Get(ctx, promptID); err != nil {
		return nil, err
	}
	query := `
		SELECT id, prompt_id, version, title, content, description,
			tags_json, favorite, created_at
		FROM prompt_versions
		WHERE prompt_id = ?
		ORDER BY version DESC`
	rows, err := s.db.QueryContext(ctx, query, promptID)
	if err != nil {
		return nil, fmt.Errorf("list prompt versions: %w", err)
	}
	defer rows.Close()
	return scanPromptVersions(rows)
}

func (s *Store) Rollback(
	ctx context.Context,
	promptID string,
	versionID string,
	now time.Time,
) (prompt.Prompt, error) {
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		return rollbackPrompt(ctx, tx, promptID, versionID, now)
	})
	if err != nil {
		return prompt.Prompt{}, err
	}
	return s.Get(ctx, promptID)
}

func scanPromptVersions(rows *sql.Rows) ([]prompt.Version, error) {
	versions := []prompt.Version{}
	for rows.Next() {
		version, err := scanPromptVersion(rows)
		if err != nil {
			return nil, err
		}
		versions = append(versions, version)
	}
	return versions, rows.Err()
}

func scanPromptVersion(row rowScanner) (prompt.Version, error) {
	var version prompt.Version
	var favorite int
	var createdAt, tagsJSON string
	err := row.Scan(
		&version.ID, &version.PromptID, &version.Version, &version.Title,
		&version.Content, &version.Description, &tagsJSON, &favorite,
		&createdAt,
	)
	if err != nil {
		return prompt.Version{}, fmt.Errorf("scan prompt version: %w", err)
	}
	tags, err := decodeVersionTags(tagsJSON)
	if err != nil {
		return prompt.Version{}, err
	}
	version.Tags = tags
	version.Favorite = favorite == 1
	version.CreatedAt = parseTime(createdAt)
	return version, nil
}

func insertPromptVersion(
	ctx context.Context,
	tx *sql.Tx,
	item prompt.Prompt,
	createdAt time.Time,
) error {
	tagsJSON, err := encodeVersionTags(item.Tags)
	if err != nil {
		return err
	}
	version, err := nextPromptVersion(ctx, tx, item.ID)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO prompt_versions (
			id, prompt_id, version, title, content, description,
			tags_json, favorite, created_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		core.NewID(), item.ID, version, item.Title, item.Content,
		item.Description, tagsJSON, boolInt(item.Favorite), sqlTime(createdAt))
	if err != nil {
		return fmt.Errorf("insert prompt version: %w", err)
	}
	return nil
}

func nextPromptVersion(ctx context.Context, tx *sql.Tx, promptID string) (int, error) {
	var version int
	err := tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(version), 0) + 1
		FROM prompt_versions
		WHERE prompt_id = ?`, promptID).Scan(&version)
	if err != nil {
		return 0, fmt.Errorf("read next prompt version: %w", err)
	}
	return version, nil
}

func existingPromptForHistory(
	ctx context.Context,
	tx *sql.Tx,
	id string,
) (prompt.Prompt, bool, error) {
	item, err := readPromptTx(ctx, tx, id)
	if err == nil {
		return item, true, nil
	}
	if isNotFound(err) {
		return prompt.Prompt{}, false, nil
	}
	return prompt.Prompt{}, false, err
}

func rollbackPrompt(
	ctx context.Context,
	tx *sql.Tx,
	promptID string,
	versionID string,
	now time.Time,
) error {
	current, err := readPromptTx(ctx, tx, promptID)
	if err != nil {
		return err
	}
	version, err := readPromptVersion(ctx, tx, promptID, versionID)
	if err != nil {
		return err
	}
	restored := promptFromVersion(version, current, now)
	if promptContentChanged(current, restored) {
		if err := insertPromptVersion(ctx, tx, current, now); err != nil {
			return err
		}
	}
	if err := updatePrompt(ctx, tx, restored); err != nil {
		return err
	}
	return replacePromptTags(ctx, tx, restored.ID, restored.Tags)
}

func readPromptVersion(
	ctx context.Context,
	tx *sql.Tx,
	promptID string,
	versionID string,
) (prompt.Version, error) {
	query := `
		SELECT id, prompt_id, version, title, content, description,
			tags_json, favorite, created_at
		FROM prompt_versions
		WHERE prompt_id = ? AND id = ?`
	version, err := scanPromptVersion(tx.QueryRowContext(ctx, query, promptID, versionID))
	if err != nil {
		return prompt.Version{}, mapPromptVersionReadError(err)
	}
	return version, nil
}

func promptFromVersion(
	version prompt.Version,
	current prompt.Prompt,
	updatedAt time.Time,
) prompt.Prompt {
	return prompt.Prompt{
		ID: version.PromptID, Title: version.Title, Content: version.Content,
		Description: version.Description, Tags: version.Tags,
		Favorite: version.Favorite, CreatedAt: current.CreatedAt,
		UpdatedAt: updatedAt, LastCopiedAt: current.LastCopiedAt,
		CopyCount: current.CopyCount,
	}
}

func promptContentChanged(left prompt.Prompt, right prompt.Prompt) bool {
	return left.Title != right.Title ||
		left.Content != right.Content ||
		left.Description != right.Description ||
		left.Favorite != right.Favorite ||
		!tagNamesEqual(left.Tags, right.Tags)
}

func tagNamesEqual(left []prompt.Tag, right []prompt.Tag) bool {
	if len(left) != len(right) {
		return false
	}
	names := map[string]int{}
	for _, tag := range left {
		names[strings.ToLower(tag.Name)]++
	}
	for _, tag := range right {
		key := strings.ToLower(tag.Name)
		if names[key] == 0 {
			return false
		}
		names[key]--
	}
	return true
}

func encodeVersionTags(tags []prompt.Tag) (string, error) {
	names := make([]string, 0, len(tags))
	for _, tag := range tags {
		names = append(names, tag.Name)
	}
	bytes, err := json.Marshal(names)
	if err != nil {
		return "", fmt.Errorf("encode prompt version tags: %w", err)
	}
	return string(bytes), nil
}

func decodeVersionTags(value string) ([]prompt.Tag, error) {
	var names []string
	if err := json.Unmarshal([]byte(value), &names); err != nil {
		return nil, fmt.Errorf("decode prompt version tags: %w", err)
	}
	tags := make([]prompt.Tag, 0, len(names))
	for _, name := range names {
		tags = append(tags, prompt.Tag{Name: name})
	}
	return tags, nil
}

func isNotFound(err error) bool {
	var appErr *core.AppError
	return errors.As(err, &appErr) && appErr.Code == core.CodeNotFound
}

func mapPromptVersionReadError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return core.NewError(core.CodeNotFound, "找不到歷史版本。")
	}
	return fmt.Errorf("read prompt version: %w", err)
}
