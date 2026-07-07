package profile

import "time"

type Profile struct {
	ID             string    `json:"id"`
	AgentID        string    `json:"agent_id"`
	AgentName      string    `json:"agent_name"`
	Name           string    `json:"name"`
	Description    string    `json:"description"`
	Format         string    `json:"format"`
	Content        string    `json:"content"`
	DisplayContent string    `json:"display_content"`
	ContentMasked  bool      `json:"content_masked"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type SaveInput struct {
	AgentID       string `json:"agent_id"`
	Name          string `json:"name"`
	Description   string `json:"description"`
	Format        string `json:"format"`
	Content       string `json:"content"`
	ContentMasked bool   `json:"content_masked,omitempty"`
}

type ListOptions struct {
	AgentID string
}
