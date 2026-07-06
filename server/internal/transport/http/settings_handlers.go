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

func registerSettingsRoutes(mux *http.ServeMux, services *app.Services, logger logging.Logger) {
	mux.HandleFunc("GET /api/settings", getSettings(services))
	mux.HandleFunc("PUT /api/settings", updateSettings(services, logger))
}

func getSettings(services *app.Services) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		appSettings, err := services.Store.GetAppSettings(request.Context())
		if err != nil {
			writeError(writer, err)
			return
		}
		writeJSON(writer, http.StatusOK, settingsResponse{
			DBPath: services.Settings.DBPath, BackupDir: appSettings.BackupDir,
			MigrationsDir:  services.Settings.MigrationsDir,
			ServiceVersion: "0.0.1", MigrationVersion: "202607060001",
		})
	}
}

func updateSettings(services *app.Services, logger logging.Logger) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		var input updateSettingsInput
		if err := decodeJSON(request, &input); err != nil {
			writeError(writer, err)
			return
		}
		backupDir, err := validateBackupDir(input.BackupDir)
		if err != nil {
			writeError(writer, err)
			return
		}
		if err := services.Store.UpdateBackupDir(request.Context(), backupDir, services.Clock.Now()); err != nil {
			writeError(writer, err)
			return
		}
		logger.Printf("settings updated")
		getSettings(services)(writer, request)
	}
}

func validateBackupDir(path string) (string, error) {
	clean := filepath.Clean(strings.TrimSpace(path))
	if clean == "." || !filepath.IsAbs(clean) {
		return "", core.NewError(core.CodeInvalidInput, "備份目錄必須是完整路徑。")
	}
	info, err := os.Stat(clean)
	if err != nil || !info.IsDir() {
		return "", core.NewError(core.CodeFileReadError, "無法讀取設定檔，請確認路徑與權限。")
	}
	return clean, nil
}
