package prompt

import (
	"context"
	"errors"
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

func (s *Service) ListVersions(ctx context.Context, promptID string) ([]Version, error) {
	return s.repo.ListVersions(ctx, promptID)
}

func (s *Service) Rollback(ctx context.Context, id string, input RollbackInput) (Prompt, error) {
	versionID := strings.TrimSpace(input.VersionID)
	if versionID == "" {
		return Prompt{}, core.NewError(core.CodeInvalidInput, "請選擇歷史版本。")
	}
	return s.repo.Rollback(ctx, id, versionID, s.clock.Now())
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

func (s *Service) UpdateTag(ctx context.Context, id string, name string, color *string) (Tag, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Tag{}, core.NewError(core.CodeInvalidInput, "標籤名稱不可空白。")
	}
	return s.repo.UpdateTag(ctx, Tag{ID: id, Name: name, Color: color})
}

func (s *Service) DeleteTag(ctx context.Context, id string) error {
	return s.repo.DeleteTag(ctx, id)
}

func (s *Service) Export(ctx context.Context) (ExportEnvelope, error) {
	return s.repo.Export(ctx)
}

func (s *Service) PreviewImport(ctx context.Context, envelope ImportEnvelope) (ImportPreview, error) {
	plan, err := s.importPlan(ctx, envelope)
	if err != nil {
		return ImportPreview{}, err
	}
	return plan.Preview, nil
}

func (s *Service) Import(ctx context.Context, envelope ImportEnvelope) (ImportResult, error) {
	plan, err := s.importPlan(ctx, envelope)
	if err != nil {
		return ImportResult{}, err
	}
	if plan.Preview.Invalid > 0 {
		return ImportResult{}, importPreviewError(plan.Preview)
	}
	if err := s.repo.Import(ctx, plan.Writes); err != nil {
		return ImportResult{}, err
	}
	return ImportResult{Status: "ok", Preview: plan.Preview}, nil
}

func (s *Service) importPlan(ctx context.Context, envelope ImportEnvelope) (importPlan, error) {
	candidates, preview := s.prepareImportPreview(envelope)
	ids := candidateIDs(candidates)
	existing, err := s.repo.FindExisting(ctx, ids)
	if err != nil {
		return importPlan{}, err
	}
	writes := classifyImportCandidates(candidates, existing, &preview)
	return importPlan{Preview: preview, Writes: writes}, nil
}

func (s *Service) prepareImportPreview(envelope ImportEnvelope) ([]importCandidate, ImportPreview) {
	now := s.clock.Now()
	seen := map[string]bool{}
	titles := map[string]bool{}
	candidates := make([]importCandidate, 0, len(envelope.Prompts))
	preview := ImportPreview{Items: []ImportPreviewItem{}}
	for index, item := range envelope.Prompts {
		clean, err := normalizeInput(importSaveInput(item))
		if err != nil {
			addInvalidImportItem(&preview, index, item, err)
			continue
		}
		id := strings.TrimSpace(item.ID)
		if id == "" {
			id = core.NewID()
		}
		if seen[id] {
			err := core.NewError(core.CodeInvalidInput, "匯入資料含有重複 ID。")
			addInvalidImportItem(&preview, index, item, err)
			continue
		}
		titleKey := strings.ToLower(clean.Title)
		if titles[titleKey] {
			err := core.NewError(core.CodeInvalidInput, "匯入資料含有重複標題。")
			addInvalidImportItem(&preview, index, item, err)
			continue
		}
		titles[titleKey] = true
		seen[id] = true
		candidates = append(candidates, importCandidate{
			Index:  index,
			Prompt: importPrompt(id, clean, now),
		})
	}
	return candidates, preview
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
	details := importErrorDetails(index, err)
	return core.NewDetailedError(core.CodeValidationFailed, "匯入資料有誤，請修正後再匯入。", details)
}

func importPreviewError(preview ImportPreview) error {
	item := firstInvalidImportItem(preview)
	err := core.NewDetailedError(core.CodeValidationFailed, "匯入資料有誤，請修正後再匯入。", map[string]any{
		"index":       item.Index,
		"causeCode":   item.Code,
		"causeDetail": item.Error,
		"preview":     preview,
	})
	return err
}

func importErrorDetails(index int, err error) map[string]any {
	var appErr *core.AppError
	if errors.As(err, &appErr) {
		return map[string]any{
			"index":       index,
			"causeCode":   appErr.Code,
			"causeDetail": importCauseDetail(appErr),
		}
	}
	return map[string]any{
		"index":       index,
		"causeCode":   core.CodeInternalError,
		"causeDetail": "操作失敗，請稍後再試。",
	}
}

func importCauseDetail(err *core.AppError) string {
	if err.Kind == core.ErrorKindInfrastructure {
		return "操作失敗，請稍後再試。"
	}
	return err.Detail
}

func importPrompt(id string, input SaveInput, now time.Time) Prompt {
	return Prompt{
		ID: id, Title: input.Title, Content: input.Content,
		Description: input.Description, Tags: tagNames(input.Tags),
		Favorite: input.Favorite, CreatedAt: now, UpdatedAt: now,
	}
}

type importPlan struct {
	Preview ImportPreview
	Writes  []Prompt
}

type importCandidate struct {
	Index  int
	Prompt Prompt
}

func candidateIDs(candidates []importCandidate) []string {
	ids := make([]string, 0, len(candidates))
	for _, candidate := range candidates {
		ids = append(ids, candidate.Prompt.ID)
	}
	return ids
}

func classifyImportCandidates(
	candidates []importCandidate,
	existing map[string]Prompt,
	preview *ImportPreview,
) []Prompt {
	writes := []Prompt{}
	for _, candidate := range candidates {
		current, exists := existing[candidate.Prompt.ID]
		action := importAction(candidate.Prompt, current, exists)
		addImportPreviewItem(preview, candidate, action)
		if action != ImportSkipped {
			writes = append(writes, candidate.Prompt)
		}
	}
	return writes
}

func importAction(next Prompt, current Prompt, exists bool) string {
	if !exists {
		return ImportAdded
	}
	if samePromptContent(next, current) {
		return ImportSkipped
	}
	return ImportUpdated
}

func samePromptContent(left Prompt, right Prompt) bool {
	return left.Title == right.Title &&
		left.Content == right.Content &&
		left.Description == right.Description &&
		left.Favorite == right.Favorite &&
		sameTagNames(left.Tags, right.Tags)
}

func sameTagNames(left []Tag, right []Tag) bool {
	if len(left) != len(right) {
		return false
	}
	names := map[string]int{}
	for _, tag := range left {
		names[strings.ToLower(tag.Name)]++
	}
	for _, tag := range right {
		key := strings.ToLower(tag.Name)
		if names[key] == 0 {
			return false
		}
		names[key]--
	}
	return true
}

func addImportPreviewItem(preview *ImportPreview, candidate importCandidate, action string) {
	preview.Items = append(preview.Items, ImportPreviewItem{
		Index:  candidate.Index,
		ID:     candidate.Prompt.ID,
		Title:  candidate.Prompt.Title,
		Action: action,
	})
	incrementImportCount(preview, action)
}

func addInvalidImportItem(
	preview *ImportPreview,
	index int,
	item ImportPrompt,
	err error,
) {
	details := importErrorDetails(index, err)
	preview.Invalid++
	preview.Items = append(preview.Items, ImportPreviewItem{
		Index:  index,
		ID:     strings.TrimSpace(item.ID),
		Title:  strings.TrimSpace(item.Title),
		Action: ImportInvalid,
		Code:   fmtDetail(details, "causeCode"),
		Error:  fmtDetail(details, "causeDetail"),
	})
}

func incrementImportCount(preview *ImportPreview, action string) {
	switch action {
	case ImportAdded:
		preview.Added++
	case ImportUpdated:
		preview.Updated++
	case ImportSkipped:
		preview.Skipped++
	}
}

func firstInvalidImportItem(preview ImportPreview) ImportPreviewItem {
	for _, item := range preview.Items {
		if item.Action == ImportInvalid {
			return item
		}
	}
	return ImportPreviewItem{Action: ImportInvalid, Error: "匯入資料有誤。"}
}

func fmtDetail(details map[string]any, key string) string {
	value, _ := details[key].(string)
	return value
}
