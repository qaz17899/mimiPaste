package configfile

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/pelletier/go-toml/v2"
	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/configmask"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
	"github.com/qaz17899/mimiPaste/server/internal/platform/filesystem"
	"github.com/qaz17899/mimiPaste/server/internal/profile"
)

const configFilePerm = 0o600

type Service struct {
	sources    SourceRepository
	profiles   ProfileRepository
	backups    BackupRepository
	active     ActiveProfileRepository
	settings   SettingsRepository
	operations OperationRepository
	fs         filesystem.FileSystem
	clock      clock.Clock
}

type ServiceDeps struct {
	Active     ActiveProfileRepository
	Backups    BackupRepository
	Clock      clock.Clock
	FS         filesystem.FileSystem
	Operations OperationRepository
	Profiles   ProfileRepository
	Settings   SettingsRepository
	Sources    SourceRepository
}

func NewService(deps ServiceDeps) *Service {
	return &Service{
		sources: deps.Sources, profiles: deps.Profiles, backups: deps.Backups,
		active: deps.Active, settings: deps.Settings, operations: deps.Operations,
		fs: deps.FS, clock: deps.Clock,
	}
}

func (s *Service) Read(ctx context.Context, sourceID string) (ReadResult, error) {
	source, err := s.sources.GetConfigSource(ctx, sourceID)
	if err != nil {
		return ReadResult{}, err
	}
	content, err := s.readSource(source.Path)
	if err != nil {
		return ReadResult{}, err
	}
	result := s.validateContent(source.Format, content)
	fields, _ := fieldsFromContent(source.Format, content)
	masked := configmask.MaskContent(source.Format, content)
	return ReadResult{
		Source: source, Content: content, DisplayContent: masked.Content,
		ContentMasked: masked.Masked, Valid: result.Valid,
		Error: result.Error, Fields: fields,
	}, nil
}

func (s *Service) Validate(ctx context.Context, sourceID string, input ValidateInput) (ValidationResult, error) {
	source, err := s.sources.GetConfigSource(ctx, sourceID)
	if err != nil {
		return ValidationResult{}, err
	}
	content := input.Content
	if content == "" {
		bytes, err := s.readSource(source.Path)
		if err != nil {
			return ValidationResult{}, err
		}
		content = bytes
	}
	return s.validateContent(source.Format, content), nil
}

func (s *Service) SaveContent(ctx context.Context, sourceID string, input SaveContentInput) (ReadResult, error) {
	source, err := s.sources.GetConfigSource(ctx, sourceID)
	if err != nil {
		return ReadResult{}, err
	}
	if input.ContentMasked {
		return ReadResult{}, core.NewError(core.CodeInvalidInput, "內容仍包含遮蔽值，請先顯示完整內容再儲存。")
	}
	if result := s.validateContent(source.Format, input.Content); !result.Valid {
		return ReadResult{}, core.NewError(core.CodeConfigParseError, "設定格式有誤，請修正後再儲存。")
	}
	if err := s.writeSource(source.Path, input.Content); err != nil {
		return ReadResult{}, err
	}
	return s.Read(ctx, sourceID)
}

func (s *Service) Preview(ctx context.Context, sourceID string, input PreviewInput) (DiffResult, error) {
	current, next, err := s.diffPair(ctx, sourceID, input)
	if err != nil {
		return DiffResult{}, err
	}
	return DiffResult{Diff: unifiedDiff(current, next), Changed: current != next}, nil
}

func (s *Service) Apply(ctx context.Context, sourceID string, input ApplyInput) (OperationResult, error) {
	source, target, err := s.applyTarget(ctx, sourceID, input.ProfileID)
	if err != nil {
		return OperationResult{}, err
	}
	operation, err := s.beginOperation(ctx, OperationKindApply, sourceID, &target.ID)
	if err != nil {
		return OperationResult{}, err
	}
	current, err := s.readSource(source.Path)
	if err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, nil)
	}
	createdBackup, err := s.createBackup(ctx, source, &target.ID, current)
	if err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, nil)
	}
	if err := s.writeSource(source.Path, target.Content); err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, &createdBackup.ID)
	}
	if err := s.active.SetActiveProfile(ctx, source.ID, target.ID); err != nil {
		failErr := s.failOperation(ctx, operation, err, &createdBackup.ID)
		return OperationResult{}, partialApplyFailure(operation.ID, createdBackup.ID, failErr)
	}
	completed, err := s.completeOperation(ctx, operation, &createdBackup.ID)
	if err != nil {
		return OperationResult{}, err
	}
	result, err := s.Read(ctx, sourceID)
	if err != nil {
		return OperationResult{}, err
	}
	return OperationResult{Operation: completed, Config: result}, nil
}

func (s *Service) PreviewRestore(ctx context.Context, backupID string) (DiffResult, error) {
	item, err := s.backups.GetBackup(ctx, backupID)
	if err != nil {
		return DiffResult{}, err
	}
	item, err = backup.HydrateContent(s.fs, item)
	if err != nil {
		return DiffResult{}, err
	}
	source, err := s.sources.GetConfigSource(ctx, item.ConfigSourceID)
	if err != nil {
		return DiffResult{}, err
	}
	current, err := s.readSource(source.Path)
	if err != nil {
		return DiffResult{}, err
	}
	return DiffResult{Diff: unifiedDiff(current, item.Content), Changed: current != item.Content}, nil
}

func (s *Service) Restore(ctx context.Context, backupID string, input RestoreInput) (OperationResult, error) {
	if !input.Confirm {
		return OperationResult{}, core.NewError(core.CodeInvalidInput, "請先確認還原備份。")
	}
	item, err := s.backups.GetBackup(ctx, backupID)
	if err != nil {
		return OperationResult{}, err
	}
	operation, err := s.beginOperation(ctx, OperationKindRestore, item.ConfigSourceID, nil)
	if err != nil {
		return OperationResult{}, err
	}
	item, err = backup.HydrateContent(s.fs, item)
	if err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, nil)
	}
	source, err := s.sources.GetConfigSource(ctx, item.ConfigSourceID)
	if err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, nil)
	}
	current, err := s.readSource(source.Path)
	if err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, nil)
	}
	preRestoreBackup, err := s.createBackup(ctx, source, nil, current)
	if err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, nil)
	}
	if err := s.writeSource(source.Path, item.Content); err != nil {
		return OperationResult{}, s.failOperation(ctx, operation, err, &preRestoreBackup.ID)
	}
	completed, err := s.completeOperation(ctx, operation, &preRestoreBackup.ID)
	if err != nil {
		return OperationResult{}, err
	}
	result, err := s.Read(ctx, item.ConfigSourceID)
	if err != nil {
		return OperationResult{}, err
	}
	return OperationResult{Operation: completed, Config: result}, nil
}

func (s *Service) beginOperation(
	ctx context.Context,
	kind string,
	sourceID string,
	profileID *string,
) (Operation, error) {
	now := s.clock.Now()
	return s.operations.CreateOperation(ctx, Operation{
		ID: core.NewID(), Kind: kind, Status: OperationStatusRunning,
		ConfigSourceID: sourceID, ProfileID: profileID,
		CreatedAt: now, UpdatedAt: now,
	})
}

func (s *Service) completeOperation(
	ctx context.Context,
	operation Operation,
	backupID *string,
) (Operation, error) {
	operation.Status = OperationStatusCompleted
	operation.BackupID = backupID
	operation.UpdatedAt = s.clock.Now()
	return s.operations.UpdateOperation(ctx, operation)
}

func (s *Service) failOperation(
	ctx context.Context,
	operation Operation,
	err error,
	backupID *string,
) error {
	failed := failedOperation(operation, err, backupID, s.clock.Now())
	if _, updateErr := s.operations.UpdateOperation(ctx, failed); updateErr != nil {
		return operationStatusError(failed, err, updateErr)
	}
	return withOperationDetails(err, failed)
}

func failedOperation(
	operation Operation,
	err error,
	backupID *string,
	now time.Time,
) Operation {
	operation.Status = OperationStatusFailed
	operation.BackupID = backupID
	operation.ErrorCode = operationErrorCode(err)
	operation.ErrorDetail = operationErrorDetail(err)
	operation.UpdatedAt = now
	return operation
}

func operationErrorCode(err error) string {
	var appErr *core.AppError
	if errors.As(err, &appErr) {
		return appErr.Code
	}
	return core.CodeInternalError
}

func operationErrorDetail(err error) string {
	var appErr *core.AppError
	if errors.As(err, &appErr) {
		return appErr.Detail
	}
	return "操作失敗，請稍後再試。"
}

func withOperationDetails(err error, operation Operation) error {
	var appErr *core.AppError
	if !errors.As(err, &appErr) {
		return core.NewDetailedErrorWithCause(
			core.CodeInternalError,
			"操作失敗，請稍後再試。",
			operationProblemDetails(operation),
			err,
		)
	}
	return core.NewDetailedErrorWithCause(
		appErr.Code,
		appErr.Detail,
		mergeDetails(appErr.Details, operationProblemDetails(operation)),
		appErr.Cause,
	)
}

func operationStatusError(operation Operation, err error, updateErr error) error {
	return core.NewDetailedErrorWithCause(
		core.CodeInternalError,
		"操作失敗，且無法更新操作狀態。",
		operationProblemDetails(operation),
		errors.Join(err, updateErr),
	)
}

func partialApplyFailure(operationID string, backupID string, cause error) error {
	return core.NewDetailedErrorWithCause(
		core.CodeOperationPartialFailure,
		"設定檔已寫入，但套用狀態更新失敗。請確認目前設定，必要時用備份還原。",
		partialFailureDetails(operationID, backupID),
		cause,
	)
}

func partialFailureDetails(operationID string, backupID string) map[string]any {
	return map[string]any{
		"operation_id": operationID,
		"backup_id":    backupID,
		"guidance":     "設定檔可能已更新；如內容不正確，請用這份備份還原。",
	}
}

func operationProblemDetails(operation Operation) map[string]any {
	details := map[string]any{"operation_id": operation.ID}
	if operation.BackupID != nil {
		details["backup_id"] = *operation.BackupID
	}
	return details
}

func mergeDetails(left map[string]any, right map[string]any) map[string]any {
	merged := map[string]any{}
	for key, value := range left {
		merged[key] = value
	}
	for key, value := range right {
		merged[key] = value
	}
	return merged
}

func (s *Service) applyTarget(ctx context.Context, sourceID string, profileID string) (agent.ConfigSource, profile.Profile, error) {
	source, err := s.sources.GetConfigSource(ctx, sourceID)
	if err != nil {
		return agent.ConfigSource{}, profile.Profile{}, err
	}
	target, err := s.profiles.GetProfile(ctx, strings.TrimSpace(profileID))
	if err != nil {
		return agent.ConfigSource{}, profile.Profile{}, err
	}
	if source.AgentID != target.AgentID {
		return agent.ConfigSource{}, profile.Profile{}, core.NewError(core.CodeInvalidInput, "設定檔不屬於這個 Agent。")
	}
	if result := s.validateContent(source.Format, target.Content); !result.Valid {
		return agent.ConfigSource{}, profile.Profile{}, core.NewError(core.CodeConfigParseError, "設定格式有誤，請修正後再儲存。")
	}
	return source, target, nil
}

func (s *Service) diffPair(ctx context.Context, sourceID string, input PreviewInput) (string, string, error) {
	source, err := s.sources.GetConfigSource(ctx, sourceID)
	if err != nil {
		return "", "", err
	}
	current, err := s.readSource(source.Path)
	if err != nil {
		return "", "", err
	}
	if strings.TrimSpace(input.Content) != "" {
		return current, input.Content, nil
	}
	target, err := s.profiles.GetProfile(ctx, strings.TrimSpace(input.ProfileID))
	if err != nil {
		return "", "", err
	}
	return current, target.Content, nil
}

func (s *Service) readSource(path string) (string, error) {
	bytes, err := s.fs.ReadFile(filepath.Clean(path))
	if err != nil {
		return "", core.NewErrorWithCause(core.CodeFileReadError, "無法讀取設定檔，請確認路徑與權限。", err)
	}
	return string(bytes), nil
}

func (s *Service) writeSource(path string, content string) error {
	if err := s.fs.WriteFile(filepath.Clean(path), []byte(content), configFilePerm); err != nil {
		return core.NewErrorWithCause(core.CodeFileWriteError, "無法寫入設定檔，請確認路徑與權限。", err)
	}
	return nil
}

func (s *Service) createBackup(
	ctx context.Context,
	source agent.ConfigSource,
	profileID *string,
	content string,
) (backup.Backup, error) {
	id := core.NewID()
	contentPath, err := s.writeBackupFile(ctx, id, source.Path, content)
	if err != nil {
		return backup.Backup{}, err
	}
	item := backup.Backup{
		ID: id, ConfigSourceID: source.ID, ProfileID: profileID,
		Path: source.Path, Format: source.Format, ContentPath: contentPath,
		CreatedAt: s.clock.Now(),
	}
	return s.backups.CreateBackup(ctx, item)
}

func (s *Service) writeBackupFile(
	ctx context.Context,
	id string,
	sourcePath string,
	content string,
) (string, error) {
	dir, err := s.settings.GetBackupDir(ctx)
	if err != nil {
		return "", err
	}
	cleanDir := filepath.Clean(dir)
	if err := s.fs.MkdirAll(cleanDir, backup.ContentDirPerm); err != nil {
		return "", core.NewErrorWithCause(core.CodeFileWriteError, "無法建立備份目錄，請確認路徑與權限。", err)
	}
	contentPath := backup.ContentFilePath(cleanDir, id, sourcePath)
	if err := s.fs.WriteFile(contentPath, []byte(content), backup.ContentFilePerm); err != nil {
		return "", core.NewErrorWithCause(core.CodeFileWriteError, "無法寫入備份檔，請確認路徑與權限。", err)
	}
	return contentPath, nil
}

func (s *Service) validateContent(format string, content string) ValidationResult {
	switch strings.ToLower(format) {
	case "toml":
		return validateTOML(content)
	case "json":
		return validateJSON(content)
	case "text":
		return ValidationResult{Valid: true, Format: "text"}
	default:
		return ValidationResult{Valid: false, Format: format, Error: "設定檔格式尚未支援。"}
	}
}

func validateTOML(content string) ValidationResult {
	var data map[string]any
	if err := toml.Unmarshal([]byte(content), &data); err != nil {
		return ValidationResult{Valid: false, Format: "toml", Error: err.Error()}
	}
	return ValidationResult{Valid: true, Format: "toml"}
}

func validateJSON(content string) ValidationResult {
	var data any
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return ValidationResult{Valid: false, Format: "json", Error: err.Error()}
	}
	return ValidationResult{Valid: true, Format: "json"}
}

func fieldsFromContent(format string, content string) ([]Field, error) {
	switch strings.ToLower(format) {
	case "toml":
		return tomlFields(content)
	case "json":
		return jsonFields(content)
	default:
		return []Field{}, nil
	}
}

func tomlFields(content string) ([]Field, error) {
	var data map[string]any
	if err := toml.Unmarshal([]byte(content), &data); err != nil {
		return []Field{}, err
	}
	return scalarFields(data), nil
}

func jsonFields(content string) ([]Field, error) {
	var data map[string]any
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return []Field{}, err
	}
	return scalarFields(data), nil
}

func scalarFields(data map[string]any) []Field {
	keys := make([]string, 0, len(data))
	for key := range data {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	return fieldsForKeys(keys, data)
}

func fieldsForKeys(keys []string, data map[string]any) []Field {
	fields := []Field{}
	for _, key := range keys {
		value, ok := scalarValue(data[key])
		if !ok {
			continue
		}
		fields = append(fields, Field{Key: key, Value: value, Sensitive: isSensitiveKey(key)})
	}
	return fields
}

func scalarValue(value any) (string, bool) {
	switch typed := value.(type) {
	case string:
		return typed, true
	case bool, int64, float64:
		return fmt.Sprint(typed), true
	default:
		return "", false
	}
}

func isSensitiveKey(key string) bool {
	return configmask.IsSensitiveKey(key)
}

func unifiedDiff(before string, after string) string {
	if before == after {
		return "沒有變更。"
	}
	beforeLines := strings.Split(before, "\n")
	afterLines := strings.Split(after, "\n")
	return diffLines(beforeLines, afterLines)
}

func diffLines(before []string, after []string) string {
	var builder strings.Builder
	builder.WriteString("--- 目前內容\n+++ 新內容\n")
	maxLength := max(len(before), len(after))
	for index := 0; index < maxLength; index++ {
		left, right := lineAt(before, index), lineAt(after, index)
		if left == right {
			builder.WriteString("  " + left + "\n")
			continue
		}
		if index < len(before) {
			builder.WriteString("- " + left + "\n")
		}
		if index < len(after) {
			builder.WriteString("+ " + right + "\n")
		}
	}
	return builder.String()
}

func lineAt(lines []string, index int) string {
	if index >= len(lines) {
		return ""
	}
	return lines[index]
}
