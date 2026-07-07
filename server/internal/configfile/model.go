package configfile

import (
	"time"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
)

const (
	OperationKindApply   = "apply"
	OperationKindRestore = "restore"

	OperationStatusRunning   = "running"
	OperationStatusCompleted = "completed"
	OperationStatusFailed    = "failed"
)

type Field struct {
	Key       string `json:"key"`
	Value     string `json:"value"`
	Sensitive bool   `json:"sensitive"`
}

type ReadResult struct {
	Source         agent.ConfigSource `json:"source"`
	Content        string             `json:"content"`
	DisplayContent string             `json:"display_content"`
	ContentMasked  bool               `json:"content_masked"`
	Valid          bool               `json:"valid"`
	Error          string             `json:"error,omitempty"`
	Fields         []Field            `json:"fields"`
}

type Operation struct {
	ID             string    `json:"id"`
	Kind           string    `json:"kind"`
	Status         string    `json:"status"`
	ConfigSourceID string    `json:"config_source_id"`
	ProfileID      *string   `json:"profile_id,omitempty"`
	BackupID       *string   `json:"backup_id,omitempty"`
	ErrorCode      string    `json:"error_code,omitempty"`
	ErrorDetail    string    `json:"error_detail,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type OperationResult struct {
	Operation Operation  `json:"operation"`
	Config    ReadResult `json:"config"`
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
	Content       string `json:"content"`
	ContentMasked bool   `json:"content_masked,omitempty"`
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
