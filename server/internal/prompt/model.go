package prompt

import "time"

const (
	SortUpdated   = "updated"
	SortCopied    = "copied"
	SortCopyCount = "copy_count"
	SortTitle     = "title"
	CopyEventType = "copy"
	DefaultSort   = SortUpdated
	ImportAdded   = "added"
	ImportUpdated = "updated"
	ImportSkipped = "skipped"
	ImportInvalid = "invalid"
)

type Tag struct {
	ID    string  `json:"id"`
	Name  string  `json:"name"`
	Color *string `json:"color,omitempty"`
}

type Prompt struct {
	ID           string     `json:"id"`
	Title        string     `json:"title"`
	Content      string     `json:"content"`
	Description  string     `json:"description"`
	Tags         []Tag      `json:"tags"`
	Favorite     bool       `json:"favorite"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	LastCopiedAt *time.Time `json:"last_copied_at,omitempty"`
	CopyCount    int        `json:"copy_count"`
}

type Version struct {
	ID          string    `json:"id"`
	PromptID    string    `json:"prompt_id"`
	Version     int       `json:"version"`
	Title       string    `json:"title"`
	Content     string    `json:"content"`
	Description string    `json:"description"`
	Tags        []Tag     `json:"tags"`
	Favorite    bool      `json:"favorite"`
	CreatedAt   time.Time `json:"created_at"`
}

type ListOptions struct {
	Query        string
	Tags         []string
	FavoriteOnly bool
	Sort         string
}

type SaveInput struct {
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Favorite    bool     `json:"favorite"`
}

type ImportPrompt struct {
	ID          string   `json:"id"`
	Title       string   `json:"title"`
	Content     string   `json:"content"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Favorite    bool     `json:"favorite"`
}

type ImportEnvelope struct {
	Prompts []ImportPrompt `json:"prompts"`
}

type ImportPreview struct {
	Added   int                 `json:"added"`
	Updated int                 `json:"updated"`
	Skipped int                 `json:"skipped"`
	Invalid int                 `json:"invalid"`
	Items   []ImportPreviewItem `json:"items"`
}

type ImportPreviewItem struct {
	Index  int    `json:"index"`
	ID     string `json:"id,omitempty"`
	Title  string `json:"title,omitempty"`
	Action string `json:"action"`
	Code   string `json:"code,omitempty"`
	Error  string `json:"error,omitempty"`
}

type ImportResult struct {
	Status  string        `json:"status"`
	Preview ImportPreview `json:"preview"`
}

type ExportEnvelope struct {
	Prompts []Prompt `json:"prompts"`
}

type RollbackInput struct {
	VersionID string `json:"version_id"`
}
