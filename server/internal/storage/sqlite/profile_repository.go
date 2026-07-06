package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/profile"
)

func (s *Store) ListProfiles(ctx context.Context, options profile.ListOptions) ([]profile.Profile, error) {
	query, args := profileListQuery(options)
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list profiles: %w", err)
	}
	defer rows.Close()
	return scanProfiles(rows)
}

func (s *Store) GetProfile(ctx context.Context, id string) (profile.Profile, error) {
	row := s.db.QueryRowContext(ctx, profileBaseQuery()+" WHERE p.id = ?", id)
	item, err := scanProfile(row)
	if err != nil {
		return profile.Profile{}, mapProfileError(err)
	}
	return item, nil
}

func (s *Store) CreateProfile(ctx context.Context, item profile.Profile) (profile.Profile, error) {
	query := `
		INSERT INTO profiles (id, agent_id, name, description, format, content, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, item.ID, item.AgentID, item.Name,
		item.Description, item.Format, item.Content, sqlTime(item.CreatedAt), sqlTime(item.UpdatedAt))
	if err != nil {
		return profile.Profile{}, fmt.Errorf("create profile: %w", err)
	}
	return s.GetProfile(ctx, item.ID)
}

func (s *Store) EnsureProfile(ctx context.Context, item profile.Profile) (profile.Profile, error) {
	existing, err := s.profileBySignature(ctx, item)
	if err == nil {
		return existing, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return profile.Profile{}, err
	}
	return s.CreateProfile(ctx, item)
}

func (s *Store) profileBySignature(ctx context.Context, item profile.Profile) (profile.Profile, error) {
	query := profileBaseQuery() + " WHERE p.agent_id = ? AND p.name = ? AND p.description = ? ORDER BY p.created_at LIMIT 1"
	return scanProfile(s.db.QueryRowContext(ctx, query, item.AgentID, item.Name, item.Description))
}

func (s *Store) UpdateProfile(ctx context.Context, item profile.Profile) (profile.Profile, error) {
	query := `
		UPDATE profiles
		SET agent_id = ?, name = ?, description = ?, format = ?, content = ?, updated_at = ?
		WHERE id = ?`
	result, err := s.db.ExecContext(ctx, query, item.AgentID, item.Name,
		item.Description, item.Format, item.Content, sqlTime(item.UpdatedAt), item.ID)
	if err != nil {
		return profile.Profile{}, fmt.Errorf("update profile: %w", err)
	}
	if err := requireAffected(result, "找不到設定檔。"); err != nil {
		return profile.Profile{}, err
	}
	return s.GetProfile(ctx, item.ID)
}

func (s *Store) DeleteProfile(ctx context.Context, id string) error {
	result, err := s.db.ExecContext(ctx, "DELETE FROM profiles WHERE id = ?", id)
	if err != nil {
		return fmt.Errorf("delete profile: %w", err)
	}
	return requireAffected(result, "找不到設定檔。")
}

func profileListQuery(options profile.ListOptions) (string, []any) {
	args := []any{}
	query := profileBaseQuery()
	if strings.TrimSpace(options.AgentID) != "" {
		query += " WHERE p.agent_id = ?"
		args = append(args, strings.TrimSpace(options.AgentID))
	}
	return query + " ORDER BY p.updated_at DESC", args
}

func profileBaseQuery() string {
	return `
		SELECT p.id, p.agent_id, a.name, p.name, p.description,
			p.format, p.content, p.created_at, p.updated_at
		FROM profiles p
		JOIN agents a ON a.id = p.agent_id`
}

func scanProfiles(rows *sql.Rows) ([]profile.Profile, error) {
	items := []profile.Profile{}
	for rows.Next() {
		item, err := scanProfile(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanProfile(row rowScanner) (profile.Profile, error) {
	var item profile.Profile
	var createdAt, updatedAt string
	err := row.Scan(&item.ID, &item.AgentID, &item.AgentName, &item.Name,
		&item.Description, &item.Format, &item.Content, &createdAt, &updatedAt)
	item.CreatedAt = parseTime(createdAt)
	item.UpdatedAt = parseTime(updatedAt)
	return item, err
}

func mapProfileError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return core.NewError(core.CodeNotFound, "找不到設定檔。")
	}
	return fmt.Errorf("read profile: %w", err)
}
