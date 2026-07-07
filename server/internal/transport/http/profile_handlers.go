package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/profile"
)

func registerProfileRoutes(routes *apiRouteRegistrar, service *profile.Service) {
	routes.Handle(http.MethodGet, "/api/profiles", listProfiles(service))
	routes.Handle(http.MethodPost, "/api/profiles", createProfile(service))
	routes.Handle(http.MethodGet, "/api/profiles/{id}", getProfile(service))
	routes.Handle(http.MethodPut, "/api/profiles/{id}", updateProfile(service))
	routes.Handle(http.MethodDelete, "/api/profiles/{id}", deleteProfile(service))
}

func listProfiles(service *profile.Service) apiHandler {
	return func(ctx *apiContext) error {
		options := profile.ListOptions{AgentID: ctx.request.URL.Query().Get("agent_id")}
		items, err := service.List(ctx.request.Context(), options)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"profiles": items})
	}
}

func createProfile(service *profile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input profile.SaveInput
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

func getProfile(service *profile.Service) apiHandler {
	return func(ctx *apiContext) error {
		item, err := service.Get(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func updateProfile(service *profile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input profile.SaveInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		item, err := service.Update(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func deleteProfile(service *profile.Service) apiHandler {
	return func(ctx *apiContext) error {
		if err := service.Delete(ctx.request.Context(), ctx.pathValue("id")); err != nil {
			return err
		}
		return ctx.noContent()
	}
}
