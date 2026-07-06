package settings

import (
	"fmt"
	"os"
	"path/filepath"
)

const (
	defaultAddr          = "127.0.0.1:18700"
	defaultAppDirName    = "mimiPaste"
	defaultDBFileName    = "mimipaste.db"
	defaultStaticDir     = "../web/dist"
	defaultMigrationsDir = "../data/migrations"
)

type Config struct {
	Addr          string
	BackupDir     string
	DataDir       string
	DBPath        string
	MigrationsDir string
	StaticDir     string
}

func Load() (Config, error) {
	dataDir, err := defaultDataDir()
	if err != nil {
		return Config{}, err
	}
	cfg := Config{
		Addr:          envString("MIMIPASTE_ADDR", defaultAddr),
		DataDir:       envString("MIMIPASTE_DATA_DIR", dataDir),
		MigrationsDir: envString("MIMIPASTE_MIGRATIONS_DIR", defaultMigrationsDir),
		StaticDir:     envString("MIMIPASTE_STATIC_DIR", defaultStaticDir),
	}
	cfg.DBPath = envString("MIMIPASTE_DB_PATH", filepath.Join(cfg.DataDir, defaultDBFileName))
	cfg.BackupDir = envString("MIMIPASTE_BACKUP_DIR", filepath.Join(cfg.DataDir, "backups"))
	return cfg, nil
}

func defaultDataDir() (string, error) {
	configDir, err := os.UserConfigDir()
	if err != nil {
		return "", fmt.Errorf("resolve user config directory: %w", err)
	}
	return filepath.Join(configDir, defaultAppDirName), nil
}

func envString(name string, fallback string) string {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	return value
}
