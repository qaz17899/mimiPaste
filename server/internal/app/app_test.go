package app_test

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/app"
	"github.com/qaz17899/mimiPaste/server/internal/configfile"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
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
	err = services.Prompts.Import(context.Background(), prompt.ImportEnvelope{
		Prompts: []prompt.ImportPrompt{{Title: "ok", Content: "ok"}, {Title: "bad"}},
	})
	if err == nil {
		t.Fatal("invalid import succeeded")
	}
	after := len(listPrompts(t, services, prompt.ListOptions{}))
	if before != after {
		t.Fatalf("invalid import changed row count: before=%d after=%d", before, after)
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
	if result.Source.ActiveProfileID == nil || *result.Source.ActiveProfileID != target.ID {
		t.Fatalf("active profile not updated: %#v", result.Source)
	}
	if got := readFile(t, configPath); got != target.Content {
		t.Fatalf("file content = %q", got)
	}
	backups, err := services.Backups.List(context.Background())
	if err != nil || len(backups) != 1 {
		t.Fatalf("backups = %#v err=%v", backups, err)
	}
	_, err = services.Config.Restore(context.Background(), backups[0].ID, configfile.RestoreInput{Confirm: true})
	if err != nil {
		t.Fatalf("restore backup: %v", err)
	}
	if got := readFile(t, configPath); got != "model = \"old\"\nunknown = \"keep\"\n" {
		t.Fatalf("restored content = %q", got)
	}
}

func TestApplyFailureDoesNotSetActiveProfile(t *testing.T) {
	services := newTestServices(t)
	source := createSource(t, services, filepath.Join(t.TempDir(), "config.toml"))
	target := createProfile(t, services, source.AgentID, "model = \"new\"\n")
	failing := configfile.NewService(services.Store, services.Store, services.Store, services.Store, failingFS{}, fixedClock{})
	_, err := failing.Apply(context.Background(), source.ID, configfile.ApplyInput{ProfileID: target.ID})
	if err == nil {
		t.Fatal("apply succeeded with failing filesystem")
	}
	sources, err := services.Agents.ListConfigSources(context.Background())
	if err != nil {
		t.Fatalf("list sources: %v", err)
	}
	if sources[0].ActiveProfileID != nil {
		t.Fatalf("active profile changed after failed apply: %#v", sources[0])
	}
}

func newTestServices(t *testing.T) *app.Services {
	t.Helper()
	root, err := filepath.Abs("../../..")
	if err != nil {
		t.Fatalf("resolve repo root: %v", err)
	}
	cfg := settings.Config{
		DBPath:        filepath.Join(t.TempDir(), "test.db"),
		BackupDir:     filepath.Join(t.TempDir(), "backups"),
		MigrationsDir: filepath.Join(root, "data", "migrations"),
		StaticDir:     filepath.Join(root, "web", "dist"),
	}
	services, err := app.New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("new app: %v", err)
	}
	t.Cleanup(func() { _ = services.Store.Close() })
	return services
}

func createSource(t *testing.T, services *app.Services, path string) agent.ConfigSource {
	t.Helper()
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

func listPrompts(t *testing.T, services *app.Services, options prompt.ListOptions) []prompt.Prompt {
	t.Helper()
	items, err := services.Prompts.List(context.Background(), options)
	if err != nil {
		t.Fatalf("list prompts: %v", err)
	}
	return items
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

type fixedClock struct{}

func (fixedClock) Now() time.Time {
	return time.Date(2026, time.July, 6, 0, 0, 0, 0, time.UTC)
}

var _ clock.Clock = fixedClock{}

type failingFS struct{}

func (failingFS) MkdirAll(string, os.FileMode) error {
	return nil
}

func (failingFS) ReadFile(string) ([]byte, error) {
	return []byte("model = \"old\"\n"), nil
}

func (failingFS) Stat(string) (os.FileInfo, error) {
	return nil, nil
}

func (failingFS) WriteFile(string, []byte, os.FileMode) error {
	return errors.New("forced write failure")
}
