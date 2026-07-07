package httptransport

import (
	"errors"
	"net/http"
	"os"
	"path/filepath"
	"sort"
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

type apiResponder struct {
	classifier ErrorClassifier
	logger     logging.Logger
}

type apiRouteRegistrar struct {
	mux       *http.ServeMux
	responder apiResponder
	routes    []apiRoute
}

type apiRoute struct {
	method  string
	pattern string
}

type routeRegistration struct {
	cfg       settings.Config
	services  *app.Services
	logger    logging.Logger
	responder apiResponder
}

func NewServer(cfg settings.Config, services *app.Services, logger logging.Logger) *Server {
	mux := http.NewServeMux()
	responder := newAPIResponder(logger)
	registerRoutes(mux, routeRegistration{
		cfg: cfg, services: services, logger: logger, responder: responder,
	})

	return &Server{
		httpServer: &http.Server{
			Addr:              cfg.Addr,
			Handler:           withRequestID(withPanicRecovery(mux, responder)),
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

func newAPIResponder(logger logging.Logger) apiResponder {
	return apiResponder{classifier: ErrorClassifier{}, logger: logger}
}

func registerRoutes(
	mux *http.ServeMux,
	registration routeRegistration,
) {
	services := registration.services
	responder := registration.responder
	apiRoutes := newAPIRouteRegistrar(mux, responder)
	apiRoutes.Handle(http.MethodGet, "/api/health", responder.handleHealth)
	registerPromptRoutes(apiRoutes, services.Prompts)
	registerAgentRoutes(apiRoutes, services.Agents)
	registerProfileRoutes(apiRoutes, services.Profiles)
	registerConfigRoutes(apiRoutes, services.Config)
	registerBackupRoutes(apiRoutes, services.Backups)
	registerBackupConfigRoutes(apiRoutes, services.Config)
	registerSettingsRoutes(apiRoutes, services, registration.logger)
	mux.HandleFunc("/api", responder.handle(apiRoutes.handleMissingAPI))
	mux.HandleFunc("/api/", responder.handle(apiRoutes.handleMissingAPI))
	mux.HandleFunc("/", serveWeb(registration.cfg.StaticDir, registration.logger))
}

func (r apiResponder) handleHealth(ctx *apiContext) error {
	return ctx.writeJSON(http.StatusOK, map[string]string{
		"status":  "ok",
		"service": "mimiPaste",
	})
}

func newAPIRouteRegistrar(mux *http.ServeMux, responder apiResponder) *apiRouteRegistrar {
	return &apiRouteRegistrar{mux: mux, responder: responder}
}

func (r *apiRouteRegistrar) Handle(method string, pattern string, handler apiHandler) {
	r.routes = append(r.routes, apiRoute{method: method, pattern: pattern})
	r.mux.HandleFunc(method+" "+pattern, r.responder.handle(handler))
}

func (r *apiRouteRegistrar) handleMissingAPI(ctx *apiContext) error {
	allowed := r.allowedMethods(ctx.request.Method, ctx.request.URL.Path)
	if len(allowed) == 0 {
		return core.NewError(core.CodeRouteNotFound, "找不到資源。")
	}
	return core.NewDetailedError(
		core.CodeMethodNotAllowed,
		"此操作不支援。",
		map[string]any{methodNotAllowedDetailsKey: allowed},
	)
}

func (r *apiRouteRegistrar) allowedMethods(method string, path string) []string {
	methods := map[string]struct{}{}
	for _, route := range r.routes {
		if !routePatternMatches(route.pattern, path) {
			continue
		}
		if routeMethodMatches(route.method, method) {
			return nil
		}
		methods[route.method] = struct{}{}
	}
	return sortedMethods(methods)
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

func routeMethodMatches(routeMethod string, requestMethod string) bool {
	return routeMethod == requestMethod || routeMethod == http.MethodGet && requestMethod == http.MethodHead
}

func routePatternMatches(pattern string, path string) bool {
	patternSegments := pathSegments(pattern)
	requestSegments := pathSegments(path)
	if len(patternSegments) != len(requestSegments) {
		return false
	}
	for index, patternSegment := range patternSegments {
		if isPathVariable(patternSegment) {
			if requestSegments[index] == "" {
				return false
			}
			continue
		}
		if patternSegment != requestSegments[index] {
			return false
		}
	}
	return true
}

func pathSegments(path string) []string {
	return strings.Split(strings.TrimPrefix(path, "/"), "/")
}

func isPathVariable(segment string) bool {
	return strings.HasPrefix(segment, "{") && strings.HasSuffix(segment, "}")
}

func sortedMethods(methods map[string]struct{}) []string {
	result := make([]string, 0, len(methods))
	for method := range methods {
		result = append(result, method)
	}
	if _, ok := methods[http.MethodGet]; ok {
		result = append(result, http.MethodHead)
	}
	sort.Strings(result)
	return result
}
