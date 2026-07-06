package sqlite

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/core"
)

func (s *Store) EnsureBuiltInAgent(ctx context.Context, item agent.Agent) error {
	query := "INSERT OR IGNORE INTO agents (id, name, kind, created_at) VALUES (?, ?, ?, ?)"
	_, err := s.db.ExecContext(ctx, query, item.ID, item.Name, item.Kind, sqlTime(item.CreatedAt))
	if err != nil {
		return fmt.Errorf("seed agent: %w", err)
	}
	return nil
}

func (s *Store) ListAgents(ctx context.Context) ([]agent.Agent, error) {
	rows, err := s.db.QueryContext(ctx, listAgentsSQL())
	if err != nil {
		return nil, fmt.Errorf("list agents: %w", err)
	}
	defer rows.Close()
	return scanAgents(rows)
}

func (s *Store) CreateAgent(ctx context.Context, item agent.Agent) (agent.Agent, error) {
	query := "INSERT INTO agents (id, name, kind, created_at) VALUES (?, ?, ?, ?)"
	_, err := s.db.ExecContext(ctx, query, item.ID, item.Name, item.Kind, sqlTime(item.CreatedAt))
	if err != nil {
		return agent.Agent{}, fmt.Errorf("create agent: %w", err)
	}
	return item, nil
}

func (s *Store) ListConfigSources(ctx context.Context) ([]agent.ConfigSource, error) {
	rows, err := s.db.QueryContext(ctx, listConfigSourcesSQL())
	if err != nil {
		return nil, fmt.Errorf("list config sources: %w", err)
	}
	defer rows.Close()
	return scanConfigSources(rows)
}

func (s *Store) GetConfigSource(ctx context.Context, id string) (agent.ConfigSource, error) {
	row := s.db.QueryRowContext(ctx, listConfigSourcesSQL()+" WHERE cs.id = ?", id)
	item, err := scanConfigSource(row)
	if err != nil {
		return agent.ConfigSource{}, mapConfigSourceError(err)
	}
	return item, nil
}

func (s *Store) CreateConfigSource(ctx context.Context, item agent.ConfigSource) (agent.ConfigSource, error) {
	query := `
		INSERT INTO config_sources (id, agent_id, name, path, format, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.ExecContext(ctx, query, item.ID, item.AgentID, item.Name, item.Path,
		item.Format, sqlTime(item.CreatedAt), sqlTime(item.UpdatedAt))
	if err != nil {
		return agent.ConfigSource{}, fmt.Errorf("create config source: %w", err)
	}
	return s.GetConfigSource(ctx, item.ID)
}

func listAgentsSQL() string {
	return `
		SELECT a.id, a.name, a.kind, a.created_at,
			COUNT(DISTINCT cs.id), COUNT(DISTINCT p.id)
		FROM agents a
		LEFT JOIN config_sources cs ON cs.agent_id = a.id
		LEFT JOIN profiles p ON p.agent_id = a.id
		GROUP BY a.id
		ORDER BY a.kind, a.name`
}

func listConfigSourcesSQL() string {
	return `
		SELECT cs.id, cs.agent_id, a.name, cs.name, cs.path, cs.format,
			ap.profile_id, p.name, cs.created_at, cs.updated_at
		FROM config_sources cs
		JOIN agents a ON a.id = cs.agent_id
		LEFT JOIN active_profiles ap ON ap.config_source_id = cs.id
		LEFT JOIN profiles p ON p.id = ap.profile_id`
}

func scanAgents(rows *sql.Rows) ([]agent.Agent, error) {
	items := []agent.Agent{}
	for rows.Next() {
		var item agent.Agent
		var createdAt string
		err := rows.Scan(&item.ID, &item.Name, &item.Kind, &createdAt,
			&item.ConfigSourceCount, &item.ProfileCount)
		if err != nil {
			return nil, fmt.Errorf("scan agent: %w", err)
		}
		item.CreatedAt = parseTime(createdAt)
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanConfigSources(rows *sql.Rows) ([]agent.ConfigSource, error) {
	items := []agent.ConfigSource{}
	for rows.Next() {
		item, err := scanConfigSource(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func scanConfigSource(row rowScanner) (agent.ConfigSource, error) {
	var item agent.ConfigSource
	var activeID, activeName sql.NullString
	var createdAt, updatedAt string
	err := row.Scan(&item.ID, &item.AgentID, &item.AgentName, &item.Name,
		&item.Path, &item.Format, &activeID, &activeName, &createdAt, &updatedAt)
	item.ActiveProfileID = stringPointer(activeID)
	item.ActiveProfileName = stringPointer(activeName)
	item.CreatedAt = parseTime(createdAt)
	item.UpdatedAt = parseTime(updatedAt)
	return item, err
}

func mapConfigSourceError(err error) error {
	if errors.Is(err, sql.ErrNoRows) {
		return core.NewError(core.CodeNotFound, "找不到設定來源。")
	}
	return fmt.Errorf("read config source: %w", err)
}
