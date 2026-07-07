package prompt

import (
	"context"
	"time"
)

type Repository interface {
	Create(ctx context.Context, item Prompt) (Prompt, error)
	CreateTag(ctx context.Context, name string, color *string) (Tag, error)
	Delete(ctx context.Context, id string) error
	DeleteTag(ctx context.Context, id string) error
	Export(ctx context.Context) (ExportEnvelope, error)
	FindExisting(ctx context.Context, ids []string) (map[string]Prompt, error)
	Get(ctx context.Context, id string) (Prompt, error)
	Import(ctx context.Context, prompts []Prompt) error
	List(ctx context.Context, options ListOptions) ([]Prompt, error)
	ListVersions(ctx context.Context, promptID string) ([]Version, error)
	ListTags(ctx context.Context) ([]Tag, error)
	RecordCopy(ctx context.Context, id string, copiedAt time.Time) (Prompt, error)
	Rollback(ctx context.Context, promptID string, versionID string, now time.Time) (Prompt, error)
	UpdateTag(ctx context.Context, tag Tag) (Tag, error)
	Update(ctx context.Context, item Prompt) (Prompt, error)
}
