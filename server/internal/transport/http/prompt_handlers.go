package httptransport

import (
	"net/http"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/prompt"
)

func registerPromptRoutes(mux *http.ServeMux, service *prompt.Service) {
	mux.HandleFunc("GET /api/prompts", listPrompts(service))
	mux.HandleFunc("POST /api/prompts", createPrompt(service))
	mux.HandleFunc("GET /api/prompts/{id}", getPrompt(service))
	mux.HandleFunc("PUT /api/prompts/{id}", updatePromptHandler(service))
	mux.HandleFunc("DELETE /api/prompts/{id}", deletePrompt(service))
	mux.HandleFunc("POST /api/prompts/{id}/copy", copyPrompt(service))
	mux.HandleFunc("GET /api/tags", listTags(service))
	mux.HandleFunc("POST /api/tags", createTag(service))
	mux.HandleFunc("GET /api/export/prompts", exportPrompts(service))
	mux.HandleFunc("POST /api/import/prompts", importPrompts(service))
}

func listPrompts(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		options := prompt.ListOptions{
			Query: request.URL.Query().Get("q"), Tags: queryList(request, "tag"),
			FavoriteOnly: request.URL.Query().Get("favorite") == "true",
			Sort:         request.URL.Query().Get("sort"),
		}
		items, err := service.List(request.Context(), options)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"prompts": items})
	}
}

func createPrompt(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input prompt.SaveInput
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

func getPrompt(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		item, err := service.Get(request.Context(), request.PathValue("id"))
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, item)
	}
}

func updatePromptHandler(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input prompt.SaveInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		item, err := service.Update(request.Context(), request.PathValue("id"), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, item)
	}
}

func deletePrompt(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		if err := service.Delete(request.Context(), request.PathValue("id")); err != nil {
			writeError(writer, err)
			return
		}
		writer.WriteHeader(http.StatusNoContent)
	}
}

func copyPrompt(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		item, err := service.RecordCopy(request.Context(), request.PathValue("id"))
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, item)
	}
}

func listTags(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		tags, err := service.ListTags(request.Context())
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"tags": tags})
	}
}

func createTag(service *prompt.Service) http.HandlerFunc {
	type input struct {
		Name  string  `json:"name"`
		Color *string `json:"color"`
	}
	return func(writer http.ResponseWriter, request *http.Request) {
		var body input
		if err := decodeJSON(request, &body); err != nil {
			writeError(writer, err)
			return
		}
		tag, err := service.CreateTag(request.Context(), body.Name, body.Color)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusCreated, tag)
	}
}

func exportPrompts(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		envelope, err := service.Export(request.Context())
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, envelope)
	}
}

func importPrompts(service *prompt.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var envelope prompt.ImportEnvelope
		if err := decodeJSON(request, &envelope); err != nil {
			writeError(writer, err)
			return
		}
		if err := service.Import(request.Context(), envelope); err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]string{"status": "ok"})
	}
}

func queryList(request *http.Request, key string) []string {
	values := request.URL.Query()[key]
	if len(values) == 0 {
		values = strings.Split(request.URL.Query().Get(key+"s"), ",")
	}
	return values
}
