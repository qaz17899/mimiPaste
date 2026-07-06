package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/configfile"
)

func registerBackupRoutes(mux *http.ServeMux, backupService *backup.Service) {
	mux.HandleFunc("GET /api/backups", listBackups(backupService))
	mux.HandleFunc("GET /api/backups/{id}", getBackup(backupService))
}

func registerBackupConfigRoutes(mux *http.ServeMux, configService *configfile.Service) {
	mux.HandleFunc("POST /api/backups/{id}/preview-restore", previewRestore(configService))
	mux.HandleFunc("POST /api/backups/{id}/restore", restoreBackup(configService))
}

func listBackups(service *backup.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		items, err := service.List(request.Context())
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, map[string]any{"backups": items})
	}
}

func getBackup(service *backup.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		item, err := service.Get(request.Context(), request.PathValue("id"))
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, item)
	}
}

func previewRestore(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		result, err := service.PreviewRestore(request.Context(), request.PathValue("id"))
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}

func restoreBackup(service *configfile.Service) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input configfile.RestoreInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		result, err := service.Restore(request.Context(), request.PathValue("id"), input)
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, result)
	}
}
