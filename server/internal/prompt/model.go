package prompt

import "time"

const (
	SortUpdated   = "updated"
	SortCopied    = "copied"
	SortCopyCount = "copy_count"
	SortTitle     = "title"
	CopyEventType = "copy"
	DefaultSort   = SortUpdated
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

type ExportEnvelope struct {
	Prompts []Prompt `json:"prompts"`
}
