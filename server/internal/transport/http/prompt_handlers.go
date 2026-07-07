package httptransport

import (
	"net/http"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/prompt"
)

func registerPromptRoutes(routes *apiRouteRegistrar, service *prompt.Service) {
	routes.Handle(http.MethodGet, "/api/prompts", listPrompts(service))
	routes.Handle(http.MethodPost, "/api/prompts", createPrompt(service))
	routes.Handle(http.MethodGet, "/api/prompts/{id}", getPrompt(service))
	routes.Handle(http.MethodPut, "/api/prompts/{id}", updatePromptHandler(service))
	routes.Handle(http.MethodDelete, "/api/prompts/{id}", deletePrompt(service))
	routes.Handle(http.MethodPost, "/api/prompts/{id}/copy", copyPrompt(service))
	routes.Handle(http.MethodGet, "/api/prompts/{id}/versions", listPromptVersions(service))
	routes.Handle(http.MethodPost, "/api/prompts/{id}/rollback", rollbackPrompt(service))
	routes.Handle(http.MethodGet, "/api/tags", listTags(service))
	routes.Handle(http.MethodPost, "/api/tags", createTag(service))
	routes.Handle(http.MethodPut, "/api/tags/{id}", updateTag(service))
	routes.Handle(http.MethodDelete, "/api/tags/{id}", deleteTag(service))
	routes.Handle(http.MethodGet, "/api/export/prompts", exportPrompts(service))
	routes.Handle(http.MethodPost, "/api/import/prompts/preview", previewImportPrompts(service))
	routes.Handle(http.MethodPost, "/api/import/prompts/confirm", confirmImportPrompts(service))
	routes.Handle(http.MethodPost, "/api/import/prompts", importPrompts(service))
}

func listPrompts(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		options := prompt.ListOptions{
			Query: ctx.request.URL.Query().Get("q"), Tags: queryList(ctx.request, "tag"),
			FavoriteOnly: ctx.request.URL.Query().Get("favorite") == "true",
			Sort:         ctx.request.URL.Query().Get("sort"),
		}
		items, err := service.List(ctx.request.Context(), options)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"prompts": items})
	}
}

func createPrompt(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input prompt.SaveInput
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

func getPrompt(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		item, err := service.Get(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func updatePromptHandler(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input prompt.SaveInput
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

func deletePrompt(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		if err := service.Delete(ctx.request.Context(), ctx.pathValue("id")); err != nil {
			return err
		}
		return ctx.noContent()
	}
}

func copyPrompt(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		item, err := service.RecordCopy(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func listPromptVersions(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		versions, err := service.ListVersions(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"versions": versions})
	}
}

func rollbackPrompt(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input prompt.RollbackInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		item, err := service.Rollback(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func listTags(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		tags, err := service.ListTags(ctx.request.Context())
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"tags": tags})
	}
}

func createTag(service *prompt.Service) apiHandler {
	type input struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
	}
	return func(ctx *apiContext) error {
		var body input
		if err := ctx.decodeJSON(&body); err != nil {
			return err
		}
		tag, err := service.CreateTag(ctx.request.Context(), body.Name, body.Color)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusCreated, tag)
	}
}

func updateTag(service *prompt.Service) apiHandler {
	type input struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
	}
	return func(ctx *apiContext) error {
		var body input
		if err := ctx.decodeJSON(&body); err != nil {
			return err
		}
		tag, err := service.UpdateTag(ctx.request.Context(), ctx.pathValue("id"), body.Name, body.Color)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, tag)
	}
}

func deleteTag(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		if err := service.DeleteTag(ctx.request.Context(), ctx.pathValue("id")); err != nil {
			return err
		}
		return ctx.noContent()
	}
}

func exportPrompts(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		envelope, err := service.Export(ctx.request.Context())
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, envelope)
	}
}

func importPrompts(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		return core.NewError(core.CodeInvalidInput, "請先預覽匯入資料。")
	}
}

func previewImportPrompts(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		var envelope prompt.ImportEnvelope
		if err := ctx.decodeJSON(&envelope); err != nil {
			return err
		}
		preview, err := service.PreviewImport(ctx.request.Context(), envelope)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, preview)
	}
}

func confirmImportPrompts(service *prompt.Service) apiHandler {
	return func(ctx *apiContext) error {
		var envelope prompt.ImportEnvelope
		if err := ctx.decodeJSON(&envelope); err != nil {
			return err
		}
		result, err := service.Import(ctx.request.Context(), envelope)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func queryList(request *http.Request, key string) []string {
	values := request.URL.Query()[key]
	if len(values) == 0 {
		values = strings.Split(request.URL.Query().Get(key+"s"), ",")
	}
	return values
}
