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
	Format           string    `json:"format"`
	ContentPath      string    `json:"content_path"`
	Content          string    `json:"content"`
	DisplayContent   string    `json:"display_content"`
	ContentMasked    bool      `json:"content_masked"`
	LegacyContent    string    `json:"-"`
	Pinned           bool      `json:"pinned"`
	CreatedAt        time.Time `json:"created_at"`
}

type Export struct {
	Filename string `json:"filename"`
	Content  string `json:"content"`
}

type PruneResult struct {
	Deleted []Backup `json:"deleted"`
	Kept    int      `json:"kept"`
}

type CreateInput struct {
	ConfigSourceID string
	ProfileID      *string
	Path           string
	ContentPath    string
	Content        string
	Pinned         bool
	CreatedAt      time.Time
}
