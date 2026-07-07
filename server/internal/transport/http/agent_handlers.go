package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
)

func registerAgentRoutes(routes *apiRouteRegistrar, service *agent.Service) {
	routes.Handle(http.MethodGet, "/api/agents", listAgents(service))
	routes.Handle(http.MethodPost, "/api/agents", createAgent(service))
	routes.Handle(http.MethodGet, "/api/config-sources", listConfigSources(service))
	routes.Handle(http.MethodPost, "/api/config-sources", createConfigSource(service))
}

func listAgents(service *agent.Service) apiHandler {
	return func(ctx *apiContext) error {
		items, err := service.List(ctx.request.Context())
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"agents": items})
	}
}

func createAgent(service *agent.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input agent.CreateAgentInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		item, err := service.Create(ctx.request.Context(), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusCreated, item)
	}
}

func listConfigSources(service *agent.Service) apiHandler {
	return func(ctx *apiContext) error {
		items, err := service.ListConfigSources(ctx.request.Context())
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"config_sources": items})
	}
}

func createConfigSource(service *agent.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input agent.CreateConfigSourceInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		item, err := service.CreateConfigSource(ctx.request.Context(), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusCreated, item)
	}
}
