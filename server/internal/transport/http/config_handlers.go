package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/configfile"
)

func registerConfigRoutes(routes *apiRouteRegistrar, service *configfile.Service) {
	routes.Handle(http.MethodGet, "/api/config-sources/{id}/read", readConfigSource(service))
	routes.Handle(http.MethodPost, "/api/config-sources/{id}/validate", validateConfigSource(service))
	routes.Handle(http.MethodPut, "/api/config-sources/{id}/content", saveConfigSourceContent(service))
	routes.Handle(http.MethodPost, "/api/config-sources/{id}/preview", previewConfigSource(service))
	routes.Handle(http.MethodPost, "/api/config-sources/{id}/apply", applyConfigSource(service))
}

func readConfigSource(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		result, err := service.Read(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func validateConfigSource(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input configfile.ValidateInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		result, err := service.Validate(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func saveConfigSourceContent(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input configfile.SaveContentInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		result, err := service.SaveContent(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func previewConfigSource(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input configfile.PreviewInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		result, err := service.Preview(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func applyConfigSource(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input configfile.ApplyInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		result, err := service.Apply(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}
