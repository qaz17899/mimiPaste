package backup

import "time"

type Backup struct {
	ID               string    `json:"id"`
	ConfigSourceID   string    `json:"config_source_id"`
	ConfigSourceName string    `json:"config_source_name"`
	AgentName        string    `json:"agent_name"`
	ProfileID        *string   `json:"profile_id,omitempty"`
	ProfileName      *string   `json:"profile_name,omitempty"`
	Path             string    `json:"path"`
	Content          string    `json:"content"`
	CreatedAt        time.Time `json:"created_at"`
}

type CreateInput struct {
	ConfigSourceID string
	ProfileID      *string
	Path           string
	Content        string
	CreatedAt      time.Time
}
