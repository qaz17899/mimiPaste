package app_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/app"
	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/configfile"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
	"github.com/qaz17899/mimiPaste/server/internal/platform/filesystem"
	"github.com/qaz17899/mimiPaste/server/internal/profile"
	"github.com/qaz17899/mimiPaste/server/internal/prompt"
	"github.com/qaz17899/mimiPaste/server/internal/settings"
)

func TestPromptCRUDSearchCopyImport(t *testing.T) {
	services := newTestServices(t)
	created, err := services.Prompts.Create(context.Background(), prompt.SaveInput{
		Title: "Codex plan", Content: "Use deliberate steps.", Description: "planning prompt", Tags: []string{"codex"},
	})
	if err != nil {
		t.Fatalf("create prompt: %v", err)
	}
	list := listPrompts(t, services, prompt.ListOptions{Query: "planning"})
	if len(list) != 1 || list[0].ID != created.ID {
		t.Fatalf("search by description returned %#v", list)
	}
	copied, err := services.Prompts.RecordCopy(context.Background(), created.ID)
	if err != nil {
		t.Fatalf("record copy: %v", err)
	}
	if copied.CopyCount != 1 || copied.LastCopiedAt == nil {
		t.Fatalf("copy usage was not updated: %#v", copied)
	}
	before := len(listPrompts(t, services, prompt.ListOptions{}))
	_, err = services.Prompts.Import(context.Background(), prompt.ImportEnvelope{
		Prompts: []prompt.ImportPrompt{{Title: "ok", Content: "ok"}, {Title: "bad"}},
	})
	if err == nil {
		t.Fatal("invalid import succeeded")
	}
	var appErr *core.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("import error type = %#v", err)
	}
	if appErr.Details["index"] != 1 {
		t.Fatalf("import error index = %#v", appErr.Details)
	}
	if appErr.Details["causeCode"] != core.CodeInvalidInput {
		t.Fatalf("import error cause code = %#v", appErr.Details)
	}
	if appErr.Details["causeDetail"] != "內容不可空白。" {
		t.Fatalf("import error cause detail = %#v", appErr.Details)
	}
	if _, ok := appErr.Details["cause"]; ok {
		t.Fatalf("import error exposed raw cause: %#v", appErr.Details)
	}
	after := len(listPrompts(t, services, prompt.ListOptions{}))
	if before != after {
		t.Fatalf("invalid import changed row count: before=%d after=%d", before, after)
	}
}

func TestPromptHistoryRecordsEditsAndRollback(t *testing.T) {
	services := newTestServices(t)
	created, err := services.Prompts.Create(context.Background(), prompt.SaveInput{
		Title: "Codex plan", Content: "Use deliberate steps.",
		Description: "planning prompt", Tags: []string{"codex"},
	})
	if err != nil {
		t.Fatalf("create prompt: %v", err)
	}
	updated, err := services.Prompts.Update(context.Background(), created.ID, prompt.SaveInput{
		Title: "Codex plan v2", Content: "Use sharper steps.",
		Description: "review prompt", Tags: []string{"review"}, Favorite: true,
	})
	if err != nil {
		t.Fatalf("update prompt: %v", err)
	}
	versions, err := services.Prompts.ListVersions(context.Background(), created.ID)
	if err != nil || len(versions) != 1 {
		t.Fatalf("versions = %#v err=%v", versions, err)
	}
	if versions[0].Content != created.Content || tagNames(versions[0].Tags) != "codex" {
		t.Fatalf("first version did not capture original prompt: %#v", versions[0])
	}
	rolledBack, err := services.Prompts.Rollback(context.Background(), created.ID, prompt.RollbackInput{
		VersionID: versions[0].ID,
	})
	if err != nil {
		t.Fatalf("rollback prompt: %v", err)
	}
	if rolledBack.Content != created.Content || tagNames(rolledBack.Tags) != "codex" {
		t.Fatalf("rolled back prompt = %#v", rolledBack)
	}
	versions, err = services.Prompts.ListVersions(context.Background(), created.ID)
	if err != nil || len(versions) != 2 || versions[0].Content != updated.Content {
		t.Fatalf("rollback did not preserve current version: %#v err=%v", versions, err)
	}
}

func TestPromptImportPreviewRequiresConfirm(t *testing.T) {
	services := newTestServices(t)
	existing, err := services.Prompts.Create(context.Background(), prompt.SaveInput{
		Title: "Existing", Content: "old",
	})
	if err != nil {
		t.Fatalf("create prompt: %v", err)
	}
	envelope := prompt.ImportEnvelope{Prompts: []prompt.ImportPrompt{
		{ID: existing.ID, Title: "Existing", Content: "new"},
		{Title: "Fresh", Content: "fresh"},
		{Title: "Broken"},
	}}
	preview, err := services.Prompts.PreviewImport(context.Background(), envelope)
	if err != nil {
		t.Fatalf("preview import: %v", err)
	}
	if preview.Updated != 1 || preview.Added != 1 || preview.Invalid != 1 {
		t.Fatalf("preview counts = %#v", preview)
	}
	stored, err := services.Prompts.Get(context.Background(), existing.ID)
	if err != nil || stored.Content != "old" {
		t.Fatalf("preview changed existing prompt: %#v err=%v", stored, err)
	}
	_, err = services.Prompts.Import(context.Background(), envelope)
	assertAppError(t, err, core.CodeValidationFailed)
	stored, _ = services.Prompts.Get(context.Background(), existing.ID)
	if stored.Content != "old" {
		t.Fatalf("invalid confirm changed existing prompt: %#v", stored)
	}
	result, err := services.Prompts.Import(context.Background(), prompt.ImportEnvelope{
		Prompts: envelope.Prompts[:2],
	})
	if err != nil || result.Preview.Updated != 1 || result.Preview.Added != 1 {
		t.Fatalf("confirm import result = %#v err=%v", result, err)
	}
}

func TestConfigApplyBackupAndRestore(t *testing.T) {
	services := newTestServices(t)
	configPath := filepath.Join(t.TempDir(), "config.toml")
	writeFile(t, configPath, "model = \"old\"\nunknown = \"keep\"\n")
	source := createSource(t, services, configPath)
	target := createProfile(t, services, source.AgentID, "model = \"new\"\nunknown = \"keep\"\n")
	result, err := services.Config.Apply(context.Background(), source.ID, configfile.ApplyInput{ProfileID: target.ID})
	if err != nil {
		t.Fatalf("apply profile: %v", err)
	}
	if result.Operation.Status != configfile.OperationStatusCompleted {
		t.Fatalf("operation not completed: %#v", result.Operation)
	}
	if result.Config.Source.ActiveProfileID == nil || *result.Config.Source.ActiveProfileID != target.ID {
		t.Fatalf("active profile not updated: %#v", result.Config.Source)
	}
	if got := readFile(t, configPath); got != target.Content {
		t.Fatalf("file content = %q", got)
	}
	backups, err := services.Backups.List(context.Background())
	if err != nil || len(backups) != 1 {
		t.Fatalf("backups = %#v err=%v", backups, err)
	}
	if backups[0].ContentPath == "" {
		t.Fatalf("backup did not record content path: %#v", backups[0])
	}
	if got := readFile(t, backups[0].ContentPath); got != "model = \"old\"\nunknown = \"keep\"\n" {
		t.Fatalf("backup file content = %q", got)
	}
	_, err = services.Config.Restore(context.Background(), backups[0].ID, configfile.RestoreInput{Confirm: true})
	if err != nil {
		t.Fatalf("restore backup: %v", err)
	}
	if got := readFile(t, configPath); got != "model = \"old\"\nunknown = \"keep\"\n" {
		t.Fatalf("restored content = %q", got)
	}
	backups, err = services.Backups.List(context.Background())
	if err != nil {
		t.Fatalf("list backups after restore: %v", err)
	}
	if countBackupsWithContent(backups, target.Content) != 1 {
		t.Fatalf("restore did not create pre-restore backup: %#v", backups)
	}
}

func TestStartupBackfillsLegacyBackupContent(t *testing.T) {
	cfg := testConfig(t)
	services := mustNewServices(t, cfg)
	configPath := filepath.Join(t.TempDir(), "legacy.toml")
	writeFile(t, configPath, "model = \"legacy\"\n")
	source := createSource(t, services, configPath)
	_, err := services.Store.CreateBackup(context.Background(), backup.Backup{
		ID: "legacy_backup", ConfigSourceID: source.ID, Path: source.Path,
		LegacyContent: "model = \"legacy backup\"\n", CreatedAt: fixedClock{}.Now(),
	})
	if err != nil {
		t.Fatalf("seed legacy backup: %v", err)
	}
	if err := services.Store.Close(); err != nil {
		t.Fatalf("close first services: %v", err)
	}

	restarted := mustNewServices(t, cfg)
	t.Cleanup(func() { _ = restarted.Store.Close() })
	backups, err := restarted.Backups.List(context.Background())
	if err != nil {
		t.Fatalf("list backfilled backups: %v", err)
	}
	if len(backups) != 1 {
		t.Fatalf("backups = %#v", backups)
	}
	if backups[0].Content != "model = \"legacy backup\"\n" {
		t.Fatalf("backfilled content = %q", backups[0].Content)
	}
	if backups[0].ContentPath == "" {
		t.Fatalf("backfilled backup missing content path: %#v", backups[0])
	}
}

func TestBackupPinExportDeleteAndPrune(t *testing.T) {
	const keepNewestBackupCount = 1
	services := newTestServices(t)
	source := createSource(t, services, filepath.Join(t.TempDir(), "managed.toml"))
	old := seedBackup(t, services, source, "backup_old", "old\n", false, 1)
	first := seedBackup(t, services, source, "backup_first", "first\n", false, 2)
	second := seedBackup(t, services, source, "backup_second", "second\n", false, 3)
	pinned := seedBackup(t, services, source, "backup_pinned", "pinned\n", true, 4)

	updated, err := services.Backups.SetPinned(context.Background(), first.ID, true)
	if err != nil {
		t.Fatalf("pin backup: %v", err)
	}
	if !updated.Pinned || updated.Content != first.Content {
		t.Fatalf("pinned backup = %#v", updated)
	}
	exported, err := services.Backups.Export(context.Background(), first.ID)
	if err != nil {
		t.Fatalf("export backup: %v", err)
	}
	if exported.Content != first.Content || exported.Filename == "" {
		t.Fatalf("export = %#v", exported)
	}
	result, err := services.Backups.Prune(context.Background(), keepNewestBackupCount)
	if err != nil {
		t.Fatalf("prune backups: %v", err)
	}
	if len(result.Deleted) != 1 || result.Deleted[0].ID != old.ID {
		t.Fatalf("prune result = %#v", result)
	}
	if _, err := os.Stat(old.ContentPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("deleted backup file still exists or wrong error: %v", err)
	}
	if _, err := os.Stat(second.ContentPath); err != nil {
		t.Fatalf("newest unpinned backup file was pruned: %v", err)
	}
	if err := services.Backups.Delete(context.Background(), pinned.ID); err != nil {
		t.Fatalf("delete backup: %v", err)
	}
	if _, err := os.Stat(pinned.ContentPath); !errors.Is(err, os.ErrNotExist) {
		t.Fatalf("explicitly deleted backup file still exists or wrong error: %v", err)
	}
}

func TestApplyFailureDoesNotSetActiveProfile(t *testing.T) {
	services := newTestServices(t)
	source := createSource(t, services, filepath.Join(t.TempDir(), "config.toml"))
	target := createProfile(t, services, source.AgentID, "model = \"new\"\n")
	failing := configfile.NewService(configfile.ServiceDeps{
		Active: services.Store, Backups: services.Store, Clock: fixedClock{},
		FS: failingFS{}, Operations: services.Store, Profiles: services.Store, Settings: services.Store,
		Sources: services.Store,
	})
	_, err := failing.Apply(context.Background(), source.ID, configfile.ApplyInput{ProfileID: target.ID})
	if err == nil {
		t.Fatal("apply succeeded with failing filesystem")
	}
	var appErr *core.AppError
	if !errors.As(err, &appErr) || appErr.Code != core.CodeFileWriteError {
		t.Fatalf("error = %#v", err)
	}
	if !errors.Is(err, errForcedWriteFailure) {
		t.Fatalf("write failure cause was not preserved: %v", err)
	}
	updatedSource, err := services.Agents.GetConfigSource(context.Background(), source.ID)
	if err != nil {
		t.Fatalf("read source: %v", err)
	}
	if updatedSource.ActiveProfileID != nil {
		t.Fatalf("active profile changed after failed apply: %#v", updatedSource)
	}
}

func TestRestoreBackupWriteFailureDoesNotModifyConfig(t *testing.T) {
	services := newTestServices(t)
	configPath := filepath.Join(t.TempDir(), "config.toml")
	writeFile(t, configPath, "model = \"current\"\n")
	source := createSource(t, services, configPath)
	restored := seedBackup(t, services, source, "backup_restore", "model = \"restored\"\n", false, 1)
	failing := configfile.NewService(configfile.ServiceDeps{
		Active: services.Store, Backups: services.Store, Clock: fixedClock{},
		FS:         backupWriteFailFS{failDir: services.Settings.BackupDir},
		Operations: services.Store, Profiles: services.Store, Settings: services.Store,
		Sources: services.Store,
	})
	_, err := failing.Restore(context.Background(), restored.ID, configfile.RestoreInput{Confirm: true})
	if err == nil {
		t.Fatal("restore succeeded when pre-restore backup write failed")
	}
	assertAppError(t, err, core.CodeFileWriteError)
	if !errors.Is(err, errForcedWriteFailure) {
		t.Fatalf("write failure cause was not preserved: %v", err)
	}
	if got := readFile(t, configPath); got != "model = \"current\"\n" {
		t.Fatalf("config changed after failed restore: %q", got)
	}
}

func TestApplyPartialFailureReturnsOperationDetails(t *testing.T) {
	services := newTestServices(t)
	configPath := filepath.Join(t.TempDir(), "config.toml")
	writeFile(t, configPath, "model = \"old\"\n")
	source := createSource(t, services, configPath)
	target := createProfile(t, services, source.AgentID, "model = \"new\"\n")
	failing := configfile.NewService(configfile.ServiceDeps{
		Active: failingActiveProfileRepository{}, Backups: services.Store,
		Clock: fixedClock{}, FS: filesystem.OSFileSystem{},
		Operations: services.Store, Profiles: services.Store, Settings: services.Store,
		Sources: services.Store,
	})
	_, err := failing.Apply(context.Background(), source.ID, configfile.ApplyInput{ProfileID: target.ID})
	if err == nil {
		t.Fatal("apply succeeded when active profile update failed")
	}
	appErr := assertAppError(t, err, core.CodeOperationPartialFailure)
	operationID, ok := appErr.Details["operation_id"].(string)
	if !ok || operationID == "" {
		t.Fatalf("missing operation id: %#v", appErr.Details)
	}
	backupID, ok := appErr.Details["backup_id"].(string)
	if !ok || backupID == "" {
		t.Fatalf("missing backup id: %#v", appErr.Details)
	}
	if _, ok := appErr.Details["guidance"].(string); !ok {
		t.Fatalf("missing recovery guidance: %#v", appErr.Details)
	}
	if got := readFile(t, configPath); got != target.Content {
		t.Fatalf("config was not written before partial failure: %q", got)
	}
	operation, err := services.Store.GetOperation(context.Background(), operationID)
	if err != nil {
		t.Fatalf("read operation: %v", err)
	}
	if operation.Status != configfile.OperationStatusFailed || operation.BackupID == nil {
		t.Fatalf("operation was not failed with backup: %#v", operation)
	}
}

func TestConfigSourceCreationValidatesPathAndContent(t *testing.T) {
	services := newTestServices(t)
	missingPath := filepath.Join(t.TempDir(), "missing.toml")
	_, err := services.Agents.CreateConfigSource(context.Background(), agent.CreateConfigSourceInput{
		AgentID: agent.BuiltInCodexID, Name: "Missing", Path: missingPath, Format: "toml",
	})
	assertAppError(t, err, core.CodeFileReadError)

	invalidPath := filepath.Join(t.TempDir(), "invalid.toml")
	writeFile(t, invalidPath, "model =\n")
	_, err = services.Agents.CreateConfigSource(context.Background(), agent.CreateConfigSourceInput{
		AgentID: agent.BuiltInCodexID, Name: "Invalid", Path: invalidPath, Format: "toml",
	})
	assertAppError(t, err, core.CodeConfigParseError)

	validPath := filepath.Join(t.TempDir(), "valid.toml")
	writeFile(t, validPath, "model = \"ok\"\n")
	_, err = services.Agents.CreateConfigSource(context.Background(), agent.CreateConfigSourceInput{
		AgentID: agent.BuiltInCodexID, Name: "Valid", Path: validPath, Format: "toml",
	})
	if err != nil {
		t.Fatalf("create valid source: %v", err)
	}
	_, err = services.Agents.CreateConfigSource(context.Background(), agent.CreateConfigSourceInput{
		AgentID: agent.BuiltInCodexID, Name: "Duplicate", Path: validPath, Format: "toml",
	})
	assertAppError(t, err, core.CodeConflict)
}

func TestSensitiveConfigAndBackupContentAreMasked(t *testing.T) {
	services := newTestServices(t)
	configPath := filepath.Join(t.TempDir(), "config.toml")
	writeFile(t, configPath, "api_key = \"secret-value\"\nmodel = \"old\"\n")
	source := createSource(t, services, configPath)
	target := createProfile(t, services, source.AgentID, "api_key = \"next-secret\"\nmodel = \"new\"\n")
	read, err := services.Config.Read(context.Background(), source.ID)
	if err != nil {
		t.Fatalf("read config: %v", err)
	}
	assertMaskedContent(t, read.DisplayContent, read.ContentMasked)
	if read.Content != "api_key = \"secret-value\"\nmodel = \"old\"\n" {
		t.Fatalf("raw content changed: %q", read.Content)
	}
	if _, err := services.Config.Apply(context.Background(), source.ID, configfile.ApplyInput{ProfileID: target.ID}); err != nil {
		t.Fatalf("apply profile: %v", err)
	}
	backups, err := services.Backups.List(context.Background())
	if err != nil || len(backups) != 1 {
		t.Fatalf("backups = %#v err=%v", backups, err)
	}
	assertMaskedContent(t, backups[0].DisplayContent, backups[0].ContentMasked)
}

func TestSavingMaskedContentIsBlocked(t *testing.T) {
	services := newTestServices(t)
	configPath := filepath.Join(t.TempDir(), "config.toml")
	writeFile(t, configPath, "api_key = \"secret-value\"\n")
	source := createSource(t, services, configPath)
	_, err := services.Config.SaveContent(context.Background(), source.ID, configfile.SaveContentInput{
		Content: "api_key = \"********\"\n", ContentMasked: true,
	})
	assertAppError(t, err, core.CodeInvalidInput)
	_, err = services.Profiles.Update(context.Background(), "missing", profile.SaveInput{
		AgentID: source.AgentID, Name: "遮蔽", Format: "toml",
		Content: "api_key = \"********\"\n", ContentMasked: true,
	})
	assertAppError(t, err, core.CodeInvalidInput)
}

func TestEnsureProfileSeparatesOriginalConfigsByDescription(t *testing.T) {
	services := newTestServices(t)
	now := fixedClock{}.Now()
	first := originalProfile("profile_original_one", "Claude settings.json", `{"theme":"dark"}`, now)
	second := originalProfile("profile_original_two", "Claude .claude.json", `{"agents":[]}`, now)
	savedFirst, err := services.Store.EnsureProfile(context.Background(), first)
	if err != nil {
		t.Fatalf("ensure first original: %v", err)
	}
	savedSecond, err := services.Store.EnsureProfile(context.Background(), second)
	if err != nil {
		t.Fatalf("ensure second original: %v", err)
	}
	if savedFirst.ID == savedSecond.ID {
		t.Fatalf("original config profiles were shared: first=%#v second=%#v", savedFirst, savedSecond)
	}
}

func newTestServices(t *testing.T) *app.Services {
	t.Helper()
	services := mustNewServices(t, testConfig(t))
	t.Cleanup(func() { _ = services.Store.Close() })
	return services
}

func mustNewServices(t *testing.T, cfg settings.Config) *app.Services {
	t.Helper()
	services, err := app.New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("new app: %v", err)
	}
	return services
}

func testConfig(t *testing.T) settings.Config {
	t.Helper()
	root, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatalf("resolve repo root: %v", err)
	}
	return settings.Config{
		DBPath:        filepath.Join(t.TempDir(), "test.db"),
		BackupDir:     filepath.Join(t.TempDir(), "backups"),
		MigrationsDir: filepath.Join(root, "data", "migrations"),
		StaticDir:     filepath.Join(root, "web", "dist"),
	}
}

func originalProfile(id string, description string, content string, now time.Time) profile.Profile {
	return profile.Profile{
		ID: id, AgentID: agent.BuiltInClaudeID, Name: "原本配置",
		Description: description, Format: "json", Content: content,
		CreatedAt: now, UpdatedAt: now,
	}
}

func createSource(t *testing.T, services *app.Services, path string) agent.ConfigSource {
	t.Helper()
	if _, err := os.Stat(path); errors.Is(err, os.ErrNotExist) {
		writeFile(t, path, "model = \"test\"\n")
	}
	source, err := services.Agents.CreateConfigSource(context.Background(), agent.CreateConfigSourceInput{
		AgentID: agent.BuiltInCodexID, Name: "Codex local", Path: path, Format: "toml",
	})
	if err != nil {
		t.Fatalf("create source: %v", err)
	}
	return source
}

func createProfile(t *testing.T, services *app.Services, agentID string, content string) profile.Profile {
	t.Helper()
	item, err := services.Profiles.Create(context.Background(), profile.SaveInput{
		AgentID: agentID, Name: "日常", Format: "toml", Content: content,
	})
	if err != nil {
		t.Fatalf("create profile: %v", err)
	}
	return item
}

func seedBackup(
	t *testing.T,
	services *app.Services,
	source agent.ConfigSource,
	id string,
	content string,
	pinned bool,
	createdAtDay int,
) backup.Backup {
	t.Helper()
	path := backup.ContentFilePath(services.Settings.BackupDir, id, source.Path)
	writeFile(t, path, content)
	item, err := services.Store.CreateBackup(context.Background(), backup.Backup{
		ID: id, ConfigSourceID: source.ID, ContentPath: path,
		Path: source.Path, Pinned: pinned, CreatedAt: backupTime(createdAtDay),
	})
	if err != nil {
		t.Fatalf("seed backup: %v", err)
	}
	item.Content = content
	return item
}

func listPrompts(t *testing.T, services *app.Services, options prompt.ListOptions) []prompt.Prompt {
	t.Helper()
	items, err := services.Prompts.List(context.Background(), options)
	if err != nil {
		t.Fatalf("list prompts: %v", err)
	}
	return items
}

func countBackupsWithContent(backups []backup.Backup, content string) int {
	count := 0
	for _, item := range backups {
		if item.Content == content {
			count++
		}
	}
	return count
}

func writeFile(t *testing.T, path string, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o600); err != nil {
		t.Fatalf("write file: %v", err)
	}
}

func readFile(t *testing.T, path string) string {
	t.Helper()
	bytes, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read file: %v", err)
	}
	return string(bytes)
}

func assertAppError(t *testing.T, err error, code string) *core.AppError {
	t.Helper()
	if err == nil {
		t.Fatalf("expected %s error, got nil", code)
	}
	var appErr *core.AppError
	if !errors.As(err, &appErr) {
		t.Fatalf("error type = %#v", err)
	}
	if appErr.Code != code {
		t.Fatalf("error code = %s", appErr.Code)
	}
	return appErr
}

func assertMaskedContent(t *testing.T, content string, masked bool) {
	t.Helper()
	if !masked {
		t.Fatalf("content was not marked masked: %q", content)
	}
	if strings.Contains(content, "secret-value") {
		t.Fatalf("masked content leaked secret: %q", content)
	}
	if !strings.Contains(content, "********") {
		t.Fatalf("masked content missing mask marker: %q", content)
	}
}

func backupTime(day int) time.Time {
	return time.Date(2026, time.July, day, 0, 0, 0, 0, time.UTC)
}

func tagNames(tags []prompt.Tag) string {
	names := make([]string, 0, len(tags))
	for _, tag := range tags {
		names = append(names, tag.Name)
	}
	return strings.Join(names, ",")
}

type fixedClock struct{}

func (fixedClock) Now() time.Time {
	return time.Date(2026, time.July, 6, 0, 0, 0, 0, time.UTC)
}

var _ clock.Clock = fixedClock{}

var errForcedWriteFailure = errors.New("forced write failure")

type failingFS struct{}

func (failingFS) MkdirAll(string, os.FileMode) error {
	return nil
}

func (failingFS) ReadFile(string) ([]byte, error) {
	return []byte("model = \"old\"\n"), nil
}

func (failingFS) Remove(string) error {
	return nil
}

func (failingFS) Stat(string) (os.FileInfo, error) {
	return nil, nil
}

func (failingFS) WriteFile(string, []byte, os.FileMode) error {
	return errForcedWriteFailure
}

type backupWriteFailFS struct {
	filesystem.OSFileSystem
	failDir string
}

func (fs backupWriteFailFS) WriteFile(path string, data []byte, perm os.FileMode) error {
	if filepath.Clean(filepath.Dir(path)) == filepath.Clean(fs.failDir) {
		return errForcedWriteFailure
	}
	return fs.OSFileSystem.WriteFile(path, data, perm)
}

var errForcedActiveFailure = errors.New("forced active profile failure")

type failingActiveProfileRepository struct{}

func (failingActiveProfileRepository) SetActiveProfile(
	context.Context,
	string,
	string,
) error {
	return errForcedActiveFailure
}
