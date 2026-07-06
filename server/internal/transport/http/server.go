package httptransport

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/app"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/logging"
	"github.com/qaz17899/mimiPaste/server/internal/settings"
)

type Server struct {
	httpServer *http.Server
	logger     logging.Logger
}

type errorEnvelope struct {
	Error apiError `json:"error"`
}

type apiError struct {
	Code    string         `json:"code"`
	Message string         `json:"message"`
	Details map[string]any `json:"details"`
}

func NewServer(cfg settings.Config, services *app.Services, logger logging.Logger) *Server {
	mux := http.NewServeMux()
	registerRoutes(mux, cfg, services, logger)

	return &Server{
		httpServer: &http.Server{
			Addr:              cfg.Addr,
			Handler:           mux,
			ReadHeaderTimeout: defaultReadHeaderTimeout,
		},
		logger: logger,
	}
}

func (s *Server) ListenAndServe() error {
	s.logger.Printf("listening on http://%s", s.httpServer.Addr)
	err := s.httpServer.ListenAndServe()
	if errors.Is(err, http.ErrServerClosed) {
		return nil
	}
	return err
}

func registerRoutes(mux *http.ServeMux, cfg settings.Config, services *app.Services, logger logging.Logger) {
	mux.HandleFunc("GET /api/health", handleHealth)
	registerPromptRoutes(mux, services.Prompts)
	registerAgentRoutes(mux, services.Agents)
	registerProfileRoutes(mux, services.Profiles)
	registerConfigRoutes(mux, services.Config)
	registerBackupRoutes(mux, services.Backups)
	registerBackupConfigRoutes(mux, services.Config)
	registerSettingsRoutes(mux, services, logger)
	mux.HandleFunc("/api/", handleMissingAPI)
	mux.HandleFunc("/", serveWeb(cfg.StaticDir, logger))
}

func handleHealth(writer http.ResponseWriter, request *http.Request) {
	writeJSON(writer, http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "mimiPaste",
	})
}

func handleMissingAPI(writer http.ResponseWriter, request *http.Request) {
	writeError(writer, core.NewError(core.CodeRouteNotFound, "找不到資源。"))
}

func serveWeb(staticDir string, logger logging.Logger) http.HandlerFunc {
	fileServer := http.FileServer(http.Dir(staticDir))
	indexPath := filepath.Join(staticDir, "index.html")

	return func(writer http.ResponseWriter, request *http.Request) {
		if _, err := os.Stat(indexPath); err != nil {
			logger.Printf("web build missing at %s", indexPath)
			http.Error(writer, "web build not found", http.StatusNotFound)
			return
		}
		requestedPath := staticFilePath(staticDir, request.URL.Path)
		if info, err := os.Stat(requestedPath); err == nil && !info.IsDir() {
			fileServer.ServeHTTP(writer, request)
			return
		}
		if strings.HasPrefix(request.URL.Path, "/assets/") {
			http.NotFound(writer, request)
			return
		}
		http.ServeFile(writer, request, indexPath)
	}
}

func staticFilePath(staticDir string, requestPath string) string {
	cleanPath := filepath.Clean("/" + requestPath)
	return filepath.Join(staticDir, strings.TrimPrefix(cleanPath, "/"))
}

func writeJSON(writer http.ResponseWriter, status int, payload any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	if err := json.NewEncoder(writer).Encode(payload); err != nil {
		panic(err)
	}
}

func writeError(writer http.ResponseWriter, err error) {
	appErr := toAppError(err)
	writeJSON(writer, statusForCode(appErr.Code), errorEnvelope{
		Error: apiError{Code: appErr.Code, Message: appErr.Message, Details: appErr.Details},
	})
}

func decodeJSON(request *http.Request, target any) error {
	if err := json.NewDecoder(request.Body).Decode(target); err != nil {
		return core.NewError(core.CodeInvalidInput, "資料格式有誤，請重新確認。")
	}
	return nil
}

func toAppError(err error) *core.AppError {
	var appErr *core.AppError
	if errors.As(err, &appErr) {
		return appErr
	}
	return core.NewError(core.CodeDatabaseError, "操作失敗，請稍後再試。")
}

func statusForCode(code string) int {
	switch code {
	case core.CodeInvalidInput, core.CodeConfigParseError, core.CodeValidationFailed, core.CodeUnsupportedFormat:
		return http.StatusBadRequest
	case core.CodeNotFound, core.CodeRouteNotFound:
		return http.StatusNotFound
	case core.CodeConflict:
		return http.StatusConflict
	case core.CodeFileReadError, core.CodeFileWriteError:
		return http.StatusUnprocessableEntity
	default:
		return http.StatusInternalServerError
	}
}
