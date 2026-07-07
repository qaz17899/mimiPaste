package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/backup"
	"github.com/qaz17899/mimiPaste/server/internal/configfile"
)

func registerBackupRoutes(routes *apiRouteRegistrar, service *backup.Service) {
	routes.Handle(http.MethodGet, "/api/backups", listBackups(service))
	routes.Handle(http.MethodPost, "/api/backups/prune", pruneBackups(service))
	routes.Handle(http.MethodGet, "/api/backups/{id}", getBackup(service))
	routes.Handle(http.MethodDelete, "/api/backups/{id}", deleteBackup(service))
	routes.Handle(http.MethodGet, "/api/backups/{id}/export", exportBackup(service))
	routes.Handle(http.MethodPut, "/api/backups/{id}/pin", pinBackup(service))
}

func registerBackupConfigRoutes(routes *apiRouteRegistrar, service *configfile.Service) {
	routes.Handle(http.MethodPost, "/api/backups/{id}/preview-restore", previewRestore(service))
	routes.Handle(http.MethodPost, "/api/backups/{id}/restore", restoreBackup(service))
}

func listBackups(service *backup.Service) apiHandler {
	return func(ctx *apiContext) error {
		items, err := service.List(ctx.request.Context())
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, map[string]any{"backups": items})
	}
}

func getBackup(service *backup.Service) apiHandler {
	return func(ctx *apiContext) error {
		item, err := service.Get(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func deleteBackup(service *backup.Service) apiHandler {
	return func(ctx *apiContext) error {
		if err := service.Delete(ctx.request.Context(), ctx.pathValue("id")); err != nil {
			return err
		}
		return ctx.noContent()
	}
}

func exportBackup(service *backup.Service) apiHandler {
	return func(ctx *apiContext) error {
		result, err := service.Export(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func pinBackup(service *backup.Service) apiHandler {
	type input struct {
		Pinned bool `json:"pinned"`
	}
	return func(ctx *apiContext) error {
		var body input
		if err := ctx.decodeJSON(&body); err != nil {
			return err
		}
		item, err := service.SetPinned(ctx.request.Context(), ctx.pathValue("id"), body.Pinned)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, item)
	}
}

func pruneBackups(service *backup.Service) apiHandler {
	type input struct {
		Keep int `json:"keep"`
	}
	return func(ctx *apiContext) error {
		var body input
		if err := ctx.decodeJSON(&body); err != nil {
			return err
		}
		result, err := service.Prune(ctx.request.Context(), body.Keep)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func previewRestore(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		result, err := service.PreviewRestore(ctx.request.Context(), ctx.pathValue("id"))
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}

func restoreBackup(service *configfile.Service) apiHandler {
	return func(ctx *apiContext) error {
		var input configfile.RestoreInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		result, err := service.Restore(ctx.request.Context(), ctx.pathValue("id"), input)
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, result)
	}
}
