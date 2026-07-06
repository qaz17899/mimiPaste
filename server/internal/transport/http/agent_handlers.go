package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
)

func registerAgentRoutes(mux *http.ServeMux, service *agent.Service) {
	mux.HandleFunc("GET /api/agents", listAgents(service))
	mux.HandleFunc("POST /api/agents", createAgent(service))
	mux.HandleFunc("GET /api/config-sources", listConfigSources(service))
	mux.HandleFunc("POST /api/config-sources", createConfigSource(service))
}

func listAgents(service *agent.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		items, err := service.List(request.Context())
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"agents": items})
	}
}

func createAgent(service *agent.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input agent.CreateAgentInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		item, err := service.Create(request.Context(), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusCreated, item)
	}
}

func listConfigSources(service *agent.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		items, err := service.ListConfigSources(request.Context())
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"config_sources": items})
	}
}

func createConfigSource(service *agent.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input agent.CreateConfigSourceInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		item, err := service.CreateConfigSource(request.Context(), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusCreated, item)
	}
}
