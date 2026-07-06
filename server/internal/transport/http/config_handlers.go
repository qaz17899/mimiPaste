package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/configfile"
)

func registerConfigRoutes(mux *http.ServeMux, service *configfile.Service) {
	mux.HandleFunc("GET /api/config-sources/{id}/read", readConfigSource(service))
	mux.HandleFunc("POST /api/config-sources/{id}/validate", validateConfigSource(service))
	mux.HandleFunc("PUT /api/config-sources/{id}/content", saveConfigSourceContent(service))
	mux.HandleFunc("POST /api/config-sources/{id}/preview", previewConfigSource(service))
	mux.HandleFunc("POST /api/config-sources/{id}/apply", applyConfigSource(service))
}

func readConfigSource(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		result, err := service.Read(request.Context(), request.PathValue("id"))
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}

func validateConfigSource(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input configfile.ValidateInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		result, err := service.Validate(request.Context(), request.PathValue("id"), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}

func saveConfigSourceContent(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input configfile.SaveContentInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		result, err := service.SaveContent(request.Context(), request.PathValue("id"), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}

func previewConfigSource(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input configfile.PreviewInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		result, err := service.Preview(request.Context(), request.PathValue("id"), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}

func applyConfigSource(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input configfile.ApplyInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		result, err := service.Apply(request.Context(), request.PathValue("id"), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}
