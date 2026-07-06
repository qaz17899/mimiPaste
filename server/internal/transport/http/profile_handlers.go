package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/profile"
)

func registerProfileRoutes(mux *http.ServeMux, service *profile.Service) {
	mux.HandleFunc("GET /api/profiles", listProfiles(service))
	mux.HandleFunc("POST /api/profiles", createProfile(service))
	mux.HandleFunc("GET /api/profiles/{id}", getProfile(service))
	mux.HandleFunc("PUT /api/profiles/{id}", updateProfile(service))
	mux.HandleFunc("DELETE /api/profiles/{id}", deleteProfile(service))
}

func listProfiles(service *profile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		options := profile.ListOptions{AgentID: request.URL.Query().Get("agent_id")}
		items, err := service.List(request.Context(), options)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"profiles": items})
	}
}

func createProfile(service *profile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input profile.SaveInput
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

func getProfile(service *profile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		item, err := service.Get(request.Context(), request.PathValue("id"))
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, item)
	}
}

func updateProfile(service *profile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input profile.SaveInput
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

func deleteProfile(service *profile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		if err := service.Delete(request.Context(), request.PathValue("id")); err != nil {
			writeError(writer, err)
			return
		}
		writer.WriteHeader(http.StatusNoContent)
	}
}
