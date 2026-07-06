package prompt

import (
	"context"
	"strings"
	"time"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
)

type Service struct {
	repo  Repository
	clock clock.Clock
}

func NewService(repo Repository, clock clock.Clock) *Service {
	return &Service{repo: repo, clock: clock}
}

func (s *Service) Create(ctx context.Context, input SaveInput) (Prompt, error) {
	clean, err := normalizeInput(input)
	if err != nil {
		return Prompt{}, err
	}
	now := s.clock.Now()
	item := Prompt{
		ID: core.NewID(), Title: clean.Title, Content: clean.Content,
		Description: clean.Description, Tags: tagNames(clean.Tags),
		Favorite: clean.Favorite, CreatedAt: now, UpdatedAt: now,
	}
	return s.repo.Create(ctx, item)
}

func (s *Service) Update(ctx context.Context, id string, input SaveInput) (Prompt, error) {
	clean, err := normalizeInput(input)
	if err != nil {
		return Prompt{}, err
	}
	item, err := s.repo.Get(ctx, id)
	if err != nil {
		return Prompt{}, err
	}
	item.Title = clean.Title
	item.Content = clean.Content
	item.Description = clean.Description
	item.Tags = tagNames(clean.Tags)
	item.Favorite = clean.Favorite
	item.UpdatedAt = s.clock.Now()
	return s.repo.Update(ctx, item)
}

func (s *Service) List(ctx context.Context, options ListOptions) ([]Prompt, error) {
	options.Query = strings.TrimSpace(options.Query)
	options.Tags = normalizeTags(options.Tags)
	if options.Sort == "" {
		options.Sort = DefaultSort
	}
	return s.repo.List(ctx, options)
}

func (s *Service) Get(ctx context.Context, id string) (Prompt, error) {
	return s.repo.Get(ctx, id)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) RecordCopy(ctx context.Context, id string) (Prompt, error) {
	return s.repo.RecordCopy(ctx, id, s.clock.Now())
}

func (s *Service) ListTags(ctx context.Context) ([]Tag, error) {
	return s.repo.ListTags(ctx)
}

func (s *Service) CreateTag(ctx context.Context, name string, color *string) (Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Tag{}, core.NewError(core.CodeInvalidInput, "標籤名稱不可空白。")
	}
	return s.repo.CreateTag(ctx, name, color)
}

func (s *Service) Export(ctx context.Context) (ExportEnvelope, error) {
	return s.repo.Export(ctx)
}

func (s *Service) Import(ctx context.Context, envelope ImportEnvelope) error {
	items, err := s.prepareImport(envelope)
	if err != nil {
		return err
	}
	return s.repo.Import(ctx, items)
}

func (s *Service) prepareImport(envelope ImportEnvelope) ([]Prompt, error) {
	now := s.clock.Now()
	seen := map[string]bool{}
	items := make([]Prompt, 0, len(envelope.Prompts))
	for index, item := range envelope.Prompts {
		clean, err := normalizeInput(importSaveInput(item))
		if err != nil {
			return nil, importError(index, err)
		}
		id := strings.TrimSpace(item.ID)
		if id == "" {
			id = core.NewID()
		}
		if seen[id] {
			return nil, importError(index, core.NewError(core.CodeInvalidInput, "匯入資料含有重複 ID。"))
		}
		seen[id] = true
		items = append(items, importPrompt(id, clean, now))
	}
	return items, nil
}

func importSaveInput(item ImportPrompt) SaveInput {
	return SaveInput{
		Title: item.Title, Content: item.Content, Description: item.Description,
		Tags: item.Tags, Favorite: item.Favorite,
	}
}

func normalizeInput(input SaveInput) (SaveInput, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Content = strings.TrimSpace(input.Content)
	input.Description = strings.TrimSpace(input.Description)
	input.Tags = normalizeTags(input.Tags)
	if input.Title == "" {
		return SaveInput{}, core.NewError(core.CodeInvalidInput, "標題不可空白。")
	}
	if input.Content == "" {
		return SaveInput{}, core.NewError(core.CodeInvalidInput, "內容不可空白。")
	}
	return input, nil
}

func normalizeTags(values []string) []string {
	result := make([]string, 0, len(values))
	seen := map[string]bool{}
	for _, value := range values {
		name := strings.TrimSpace(value)
		if name == "" || seen[strings.ToLower(name)] {
			continue
		}
		seen[strings.ToLower(name)] = true
		result = append(result, name)
	}
	return result
}

func tagNames(values []string) []Tag {
	tags := make([]Tag, 0, len(values))
	for _, value := range values {
		tags = append(tags, Tag{Name: value})
	}
	return tags
}

func importError(index int, err error) error {
	return core.NewDetailedError(core.CodeValidationFailed, "匯入資料有誤，請修正後再匯入。", map[string]any{
		"index": index,
		"cause": err.Error(),
	})
}

func importPrompt(id string, input SaveInput, now time.Time) Prompt {
	return Prompt{
		ID: id, Title: input.Title, Content: input.Content,
		Description: input.Description, Tags: tagNames(input.Tags),
		Favorite: input.Favorite, CreatedAt: now, UpdatedAt: now,
	}
}
