package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/prompt"
)

const promptColumns = `
	p.id, p.title, p.content, p.description, p.favorite,
	p.created_at, p.updated_at, p.last_copied_at, p.copy_count`

func (s *Store) Create(ctx context.Context, item prompt.Prompt) (prompt.Prompt, error) {
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		if err := insertPrompt(ctx, tx, item); err != nil {
			return err
		}
		return replacePromptTags(ctx, tx, item.ID, item.Tags)
	})
	if err != nil {
		return prompt.Prompt{}, err
	}
	return s.Get(ctx, item.ID)
}

func (s *Store) Update(ctx context.Context, item prompt.Prompt) (prompt.Prompt, error) {
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		if err := updatePrompt(ctx, tx, item); err != nil {
			return err
		}
		return replacePromptTags(ctx, tx, item.ID, item.Tags)
	})
	if err != nil {
		return prompt.Prompt{}, err
	}
	return s.Get(ctx, item.ID)
}

func (s *Store) Get(ctx context.Context, id string) (prompt.Prompt, error) {
	query := "SELECT " + promptColumns + " FROM prompts p WHERE p.id = ?"
	item, err := scanPrompt(s.db.QueryRowContext(ctx, query, id))
	if err != nil {
		return prompt.Prompt{}, mapPromptReadError(err)
	}
	tags, err := s.promptTags(ctx, id)
	if err != nil {
		return prompt.Prompt{}, err
	}
	item.Tags = tags
	return item, nil
}

func (s *Store) List(ctx context.Context, options prompt.ListOptions) ([]prompt.Prompt, error) {
	query, args := buildPromptListQuery(options)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list prompts: %w", err)
	}
	defer rows.Close()
	return s.scanPromptRows(ctx, rows)
}

func (s *Store) Delete(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM prompts WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("delete prompt: %w", err)
	}
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read delete result: %w", err)
	}
	if affected == 0 {
		return core.NewError(core.CodeNotFound, "找不到提示詞。")
	}
	return nil
}

func (s *Store) RecordCopy(ctx context.Context, id string, copiedAt time.Time) (prompt.Prompt, error) {
	err := s.withTx(ctx, func(tx *sql.Tx) error {
		if err := recordPromptCopy(ctx, tx, id, copiedAt); err != nil {
			return err
		}
		return insertUsageEvent(ctx, tx, id, copiedAt)
	})
	if err != nil {
		return prompt.Prompt{}, err
	}
	return s.Get(ctx, id)
}

func (s *Store) ListTags(ctx context.Context) ([]prompt.Tag, error) {
	rows, err := s.db.QueryContext(ctx, "SELECT id, name, color FROM tags ORDER BY name")
	if err != nil {
		return nil, fmt.Errorf("list tags: %w", err)
	}
	defer rows.Close()
	return scanTags(rows)
}

func (s *Store) CreateTag(ctx context.Context, name string, color *string) (prompt.Tag, error) {
	id, err := ensureTag(ctx, s.db, name, color)
	if err != nil {
		return prompt.Tag{}, err
	}
	return prompt.Tag{ID: id, Name: name, Color: color}, nil
}

func (s *Store) Export(ctx context.Context) (prompt.ExportEnvelope, error) {
	items, err := s.List(ctx, prompt.ListOptions{Sort: prompt.SortTitle})
	if err != nil {
		return prompt.ExportEnvelope{}, err
	}
	return prompt.ExportEnvelope{Prompts: items}, nil
}

func (s *Store) Import(ctx context.Context, prompts []prompt.Prompt) error {
	return s.withTx(ctx, func(tx *sql.Tx) error {
		for _, item := range prompts {
			if err := upsertImportedPrompt(ctx, tx, item); err != nil {
				return err
			}
			if err := replacePromptTags(ctx, tx, item.ID, item.Tags); err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *Store) withTx(ctx context.Context, fn func(*sql.Tx) error) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPrompt(row rowScanner) (prompt.Prompt, error) {
	var item prompt.Prompt
	var favorite int
	var createdAt, updatedAt string
	var lastCopiedAt sql.NullString
	err := row.Scan(
		&item.ID, &item.Title, &item.Content, &item.Description, &favorite,
		&createdAt, &updatedAt, &lastCopiedAt, &item.CopyCount,
	)
	item.Favorite = favorite == 1
	item.CreatedAt = parseTime(createdAt)
	item.UpdatedAt = parseTime(updatedAt)
	item.LastCopiedAt = nullableTime(lastCopiedAt)
	return item, err
}

func (s *Store) scanPromptRows(ctx context.Context, rows *sql.Rows) ([]prompt.Prompt, error) {
	items := []prompt.Prompt{}
	for rows.Next() {
		item, err := scanPrompt(rows)
		if err != nil {
			return nil, fmt.Errorf("scan prompt: %w", err)
		}
		item.Tags, err = s.promptTags(ctx, item.ID)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) promptTags(ctx context.Context, promptID string) ([]prompt.Tag, error) {
	query := `
		SELECT t.id, t.name, t.color
		FROM tags t
		JOIN prompt_tags pt ON pt.tag_id = t.id
		WHERE pt.prompt_id = ?
		ORDER BY t.name`
	rows, err := s.db.QueryContext(ctx, query, promptID)
	if err != nil {
		return nil, fmt.Errorf("list prompt tags: %w", err)
	}
	defer rows.Close()
	return scanTags(rows)
}

func scanTags(rows *sql.Rows) ([]prompt.Tag, error) {
	tags := []prompt.Tag{}
	for rows.Next() {
		var tag prompt.Tag
		var color sql.NullString
		if err := rows.Scan(&tag.ID, &tag.Name, &color); err != nil {
			return nil, fmt.Errorf("scan tag: %w", err)
		}
		tag.Color = stringPointer(color)
		tags = append(tags, tag)
	}
	return tags, rows.Err()
}

func insertPrompt(ctx context.Context, tx *sql.Tx, item prompt.Prompt) error {
	query := `
		INSERT INTO prompts (
			id, title, content, description, favorite, created_at, updated_at, copy_count
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := tx.ExecContext(ctx, query, item.ID, item.Title, item.Content, item.Description,
		boolInt(item.Favorite), sqlTime(item.CreatedAt), sqlTime(item.UpdatedAt), item.CopyCount)
	if err != nil {
		return fmt.Errorf("insert prompt: %w", err)
	}
	return refreshPromptFTS(ctx, tx, item.ID)
}

func updatePrompt(ctx context.Context, tx *sql.Tx, item prompt.Prompt) error {
	query := `
		UPDATE prompts
		SET title = ?, content = ?, description = ?, favorite = ?, updated_at = ?
		WHERE id = ?`
	result, err := tx.ExecContext(ctx, query, item.Title, item.Content, item.Description,
		boolInt(item.Favorite), sqlTime(item.UpdatedAt), item.ID)
	if err != nil {
		return fmt.Errorf("update prompt: %w", err)
	}
	return requireAffected(result, "找不到提示詞。")
}

func replacePromptTags(ctx context.Context, tx *sql.Tx, promptID string, tags []prompt.Tag) error {
	if _, err := tx.ExecContext(ctx, "DELETE FROM prompt_tags WHERE prompt_id = ?", promptID); err != nil {
		return fmt.Errorf("clear prompt tags: %w", err)
	}
	for _, tag := range tags {
		tagID, err := ensureTag(ctx, tx, tag.Name, tag.Color)
		if err != nil {
			return err
		}
		if err := attachTag(ctx, tx, promptID, tagID); err != nil {
			return err
		}
	}
	return refreshPromptFTS(ctx, tx, promptID)
}

func ensureTag(ctx context.Context, exec dbExecutor, name string, color *string) (string, error) {
	id := core.NewID()
	_, err := exec.ExecContext(ctx, "INSERT OR IGNORE INTO tags (id, name, color) VALUES (?, ?, ?)", id, name, color)
	if err != nil {
		return "", fmt.Errorf("insert tag: %w", err)
	}
	err = exec.QueryRowContext(ctx, "SELECT id FROM tags WHERE name = ?", name).Scan(&id)
	if err != nil {
		return "", fmt.Errorf("read tag: %w", err)
	}
	return id, nil
}

func attachTag(ctx context.Context, tx *sql.Tx, promptID string, tagID string) error {
	_, err := tx.ExecContext(ctx, "INSERT OR IGNORE INTO prompt_tags (prompt_id, tag_id) VALUES (?, ?)", promptID, tagID)
	if err != nil {
		return fmt.Errorf("attach prompt tag: %w", err)
	}
	return nil
}

func refreshPromptFTS(ctx context.Context, tx *sql.Tx, promptID string) error {
	if _, err := tx.ExecContext(ctx, "DELETE FROM prompt_fts WHERE prompt_id = ?", promptID); err != nil {
		return fmt.Errorf("clear prompt search index: %w", err)
	}
	row := tx.QueryRowContext(ctx, promptFTSQuery(), promptID)
	var title, content, description, tags string
	if err := row.Scan(&title, &content, &description, &tags); err != nil {
		return mapPromptReadError(err)
	}
	_, err := tx.ExecContext(ctx, insertFTSQuery(), promptID, title, content, description, tags)
	if err != nil {
		return fmt.Errorf("refresh prompt search index: %w", err)
	}
	return nil
}

func promptFTSQuery() string {
	return `
		SELECT p.title, p.content, p.description, COALESCE(group_concat(t.name, ' '), '')
		FROM prompts p
		LEFT JOIN prompt_tags pt ON pt.prompt_id = p.id
		LEFT JOIN tags t ON t.id = pt.tag_id
		WHERE p.id = ?
		GROUP BY p.id`
}

func insertFTSQuery() string {
	return `
		INSERT INTO prompt_fts (prompt_id, title, content, description, tags)
		VALUES (?, ?, ?, ?, ?)`
}

func recordPromptCopy(ctx context.Context, tx *sql.Tx, id string, copiedAt time.Time) error {
	query := "UPDATE prompts SET last_copied_at = ?, copy_count = copy_count + 1 WHERE id = ?"
	result, err := tx.ExecContext(ctx, query, sqlTime(copiedAt), id)
	if err != nil {
		return fmt.Errorf("record prompt copy: %w", err)
	}
	return requireAffected(result, "找不到提示詞。")
}

func insertUsageEvent(ctx context.Context, tx *sql.Tx, promptID string, copiedAt time.Time) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO prompt_usage_events (id, prompt_id, event_type, created_at)
		VALUES (?, ?, ?, ?)`, core.NewID(), promptID, prompt.CopyEventType, sqlTime(copiedAt))
	if err != nil {
		return fmt.Errorf("insert usage event: %w", err)
	}
	return nil
}

func upsertImportedPrompt(ctx context.Context, tx *sql.Tx, item prompt.Prompt) error {
	query := `
		INSERT INTO prompts (
			id, title, content, description, favorite, created_at, updated_at, copy_count
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			title = excluded.title,
			content = excluded.content,
			description = excluded.description,
			favorite = excluded.favorite,
			updated_at = excluded.updated_at`
	_, err := tx.ExecContext(ctx, query, item.ID, item.Title, item.Content,
		item.Description, boolInt(item.Favorite), sqlTime(item.CreatedAt),
		sqlTime(item.UpdatedAt), item.CopyCount)
	if err != nil {
		return fmt.Errorf("import prompt: %w", err)
	}
	return refreshPromptFTS(ctx, tx, item.ID)
}

func buildPromptListQuery(options prompt.ListOptions) (string, []any) {
	args := []any{}
	where := []string{}
	if options.Query != "" {
		where = append(where, "p.id IN (SELECT prompt_id FROM prompt_fts WHERE prompt_fts MATCH ?)")
		args = append(args, ftsQuery(options.Query))
	}
	if options.FavoriteOnly {
		where = append(where, "p.favorite = 1")
	}
	for _, tag := range options.Tags {
		where = append(where, tagFilterClause())
		args = append(args, tag)
	}
	return promptListSQL(where, options.Sort), args
}

func promptListSQL(where []string, sort string) string {
	query := "SELECT " + promptColumns + " FROM prompts p"
	if len(where) > 0 {
		query += " WHERE " + strings.Join(where, " AND ")
	}
	return query + " ORDER BY " + promptOrderBy(sort)
}

func tagFilterClause() string {
	return `EXISTS (
		SELECT 1 FROM prompt_tags pt
		JOIN tags t ON t.id = pt.tag_id
		WHERE pt.prompt_id = p.id AND lower(t.name) = lower(?)
	)`
}

func promptOrderBy(sort string) string {
	switch sort {
	case prompt.SortCopied:
		return "p.last_copied_at IS NULL, p.last_copied_at DESC, p.updated_at DESC"
	case prompt.SortCopyCount:
		return "p.copy_count DESC, p.updated_at DESC"
	case prompt.SortTitle:
		return "lower(p.title) ASC, p.updated_at DESC"
	default:
		return "p.updated_at DESC"
	}
}

func ftsQuery(query string) string {
	terms := strings.Fields(query)
	quoted := make([]string, 0, len(terms))
	for _, term := range terms {
		quoted = append(quoted, strconv.Quote(strings.ReplaceAll(term, `"`, `""`)))
	}
	return strings.Join(quoted, " ")
}

func requireAffected(result sql.Result, message string) error {
	affected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read write result: %w", err)
	}
	if affected == 0 {
		return core.NewError(core.CodeNotFound, message)
	}
	return nil
}

type dbExecutor interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func boolInt(value bool) int {
	if value {
		return 1
	}
	return 0
}

func mapPromptReadError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return core.NewError(core.CodeNotFound, "找不到提示詞。")
	}
	return fmt.Errorf("read prompt: %w", err)
}
