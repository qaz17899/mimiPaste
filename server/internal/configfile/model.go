package configfile

import "github.com/qaz17899/mimiPaste/server/internal/agent"

type Field struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	Sensitive bool   `json:"sensitive"`
}

type ReadResult struct {
	Source  agent.ConfigSource `json:"source"`
	Content string             `json:"content"`
	Valid   bool               `json:"valid"`
	Error   string             `json:"error,omitempty"`
	Fields  []Field            `json:"fields"`
}

type ValidationResult struct {
	Valid  bool   `json:"valid"`
	Error  string `json:"error,omitempty"`
	Format string `json:"format"`
}

type DiffResult struct {
	Diff    string `json:"diff"`
	Changed bool   `json:"changed"`
}

type ValidateInput struct {
	Content string `json:"content"`
}

type SaveContentInput struct {
	Content string `json:"content"`
}

type PreviewInput struct {
	ProfileID string `json:"profile_id"`
	Content   string `json:"content"`
}

type ApplyInput struct {
	ProfileID string `json:"profile_id"`
}

type RestoreInput struct {
	Confirm bool `json:"confirm"`
}
