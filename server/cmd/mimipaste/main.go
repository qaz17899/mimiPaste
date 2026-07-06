package main

import (
	"context"
	"os"

	"github.com/qaz17899/mimiPaste/server/internal/app"
	"github.com/qaz17899/mimiPaste/server/internal/platform/logging"
	"github.com/qaz17899/mimiPaste/server/internal/settings"
	httptransport "github.com/qaz17899/mimiPaste/server/internal/transport/http"
)

func main() {
	logger := logging.New(os.Stdout)
	cfg, err := settings.Load()
	if err != nil {
		logger.Fatalf("load settings: %v", err)
	}
	services, err := app.New(context.Background(), cfg)
	if err != nil {
		logger.Fatalf("start app: %v", err)
	}
	defer func() {
		if err := services.Store.Close(); err != nil {
			logger.Printf("close database: %v", err)
		}
	}()
	server := httptransport.NewServer(cfg, services, logger)

	if err := server.ListenAndServe(); err != nil {
		logger.Fatalf("server failed: %v", err)
	}
}
