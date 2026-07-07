package httptransport

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/app"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/logging"
	"github.com/qaz17899/mimiPaste/server/internal/settings"
)

func TestCreateConfigSourceHandlerValidatesUnreadablePath(t *testing.T) {
	services, cfg := newHTTPTestServices(t)
	body := `{"agent_id":"` + agent.BuiltInCodexID + `","name":"Missing","path":"D:\\missing\\config.toml","format":"toml"}`
	recorder := serveHTTPTestRequest(
		t,
		cfg,
		services,
		http.MethodPost,
		"/api/config-sources",
		body,
	)

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusUnprocessableEntity)
	assertRequestReference(t, recorder, problem)
	if problem.Code != core.CodeFileReadError {
		t.Fatalf("code = %q", problem.Code)
	}
}

func newHTTPTestServices(t *testing.T) (*app.Services, settings.Config) {
	t.Helper()
	root, err := filepath.Abs("../../../..")
	if err != nil {
		t.Fatalf("resolve repo root: %v", err)
	}
	cfg := settings.Config{
		DBPath:        filepath.Join(t.TempDir(), "test.db"),
		BackupDir:     filepath.Join(t.TempDir(), "backups"),
		MigrationsDir: filepath.Join(root, "data", "migrations"),
		StaticDir:     t.TempDir(),
	}
	services, err := app.New(context.Background(), cfg)
	if err != nil {
		t.Fatalf("new app: %v", err)
	}
	t.Cleanup(func() { _ = services.Store.Close() })
	return services, cfg
}

func serveHTTPTestRequest(
	t *testing.T,
	cfg settings.Config,
	services *app.Services,
	method string,
	path string,
	body string,
) *httptest.ResponseRecorder {
	t.Helper()
	server := NewServer(cfg, services, logging.New(&bytes.Buffer{}))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(method, path, strings.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	server.httpServer.Handler.ServeHTTP(recorder, request)
	return recorder
}
