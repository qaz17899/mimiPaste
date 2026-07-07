package httptransport

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/app"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/logging"
)

type settingsResponse struct {
	DBPath           string `json:"db_path"`
	BackupDir        string `json:"backup_dir"`
	MigrationsDir    string `json:"migrations_dir"`
	ServiceVersion   string `json:"service_version"`
	MigrationVersion string `json:"migration_version"`
}

type updateSettingsInput struct {
	BackupDir string `json:"backup_dir"`
}

func registerSettingsRoutes(
	routes *apiRouteRegistrar,
	services *app.Services,
	logger logging.Logger,
) {
	routes.Handle(http.MethodGet, "/api/settings", getSettings(services))
	routes.Handle(http.MethodPut, "/api/settings", updateSettings(services, logger))
}

func getSettings(services *app.Services) apiHandler {
	return func(ctx *apiContext) error {
		appSettings, err := services.Store.GetAppSettings(ctx.request.Context())
		if err != nil {
			return err
		}
		return ctx.writeJSON(http.StatusOK, settingsResponse{
			DBPath: services.Settings.DBPath, BackupDir: appSettings.BackupDir,
			MigrationsDir:  services.Settings.MigrationsDir,
			ServiceVersion: "0.0.1", MigrationVersion: "202607060001",
		})
	}
}

func updateSettings(services *app.Services, logger logging.Logger) apiHandler {
	return func(ctx *apiContext) error {
		var input updateSettingsInput
		if err := ctx.decodeJSON(&input); err != nil {
			return err
		}
		backupDir, err := validateBackupDir(input.BackupDir)
		if err != nil {
			return err
		}
		if err := services.Store.UpdateBackupDir(ctx.request.Context(), backupDir, services.Clock.Now()); err != nil {
			return err
		}
		logger.Printf("settings updated")
		return getSettings(services)(ctx)
	}
}

func validateBackupDir(path string) (string, error) {
	clean := filepath.Clean(strings.TrimSpace(path))
	if clean == "." || !filepath.IsAbs(clean) {
		return "", core.NewError(core.CodeInvalidInput, "備份目錄必須是完整路徑。")
	}
	info, err := os.Stat(clean)
	if err != nil || !info.IsDir() {
		return "", core.NewErrorWithCause(core.CodeFileReadError, "無法讀取備份目錄，請確認路徑與權限。", err)
	}
	return clean, nil
}
