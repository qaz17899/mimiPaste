package agent

import "time"

const (
	BuiltInCodexID  = "agent_codex"
	BuiltInClaudeID = "agent_claude"
	KindBuiltIn     = "built-in"
	KindCustom      = "custom"
)

type Agent struct {
	ID                string    `json:"id"`
	Name              string    `json:"name"`
	Kind              string    `json:"kind"`
	ConfigSourceCount int       `json:"config_source_count"`
	ProfileCount      int       `json:"profile_count"`
	CreatedAt         time.Time `json:"created_at"`
}

type ConfigSource struct {
	ID                string    `json:"id"`
	AgentID           string    `json:"agent_id"`
	AgentName         string    `json:"agent_name"`
	Name              string    `json:"name"`
	Path              string    `json:"path"`
	Format            string    `json:"format"`
	ActiveProfileID   *string   `json:"active_profile_id,omitempty"`
	ActiveProfileName *string   `json:"active_profile_name,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type CreateAgentInput struct {
	Name string `json:"name"`
}

type CreateConfigSourceInput struct {
	AgentID string `json:"agent_id"`
	Name    string `json:"name"`
	Path    string `json:"path"`
	Format  string `json:"format"`
}
