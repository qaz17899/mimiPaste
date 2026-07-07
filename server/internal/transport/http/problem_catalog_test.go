package httptransport

import (
	"net/http"
	"testing"

	"github.com/qaz17899/mimiPaste/server/internal/core"
)

func TestProblemCatalogCoversKnownCodes(t *testing.T) {
	cases := []struct {
		code      string
		status    int
		title     string
		retryable bool
		logLevel  problemLogLevel
	}{
		{code: core.CodeConflict, status: http.StatusConflict, title: "Conflict"},
		{code: core.CodeConfigParseError, status: http.StatusBadRequest, title: "Config parse error"},
		{code: core.CodeFileReadError, status: http.StatusUnprocessableEntity, title: "File read error", logLevel: problemLogLevelError},
		{code: core.CodeFileWriteError, status: http.StatusUnprocessableEntity, title: "File write error", logLevel: problemLogLevelError},
		{code: core.CodeInvalidInput, status: http.StatusBadRequest, title: "Invalid input"},
		{code: core.CodeInternalError, status: http.StatusInternalServerError, title: "Internal error", retryable: true, logLevel: problemLogLevelError},
		{code: core.CodeMethodNotAllowed, status: http.StatusMethodNotAllowed, title: "Method not allowed"},
		{code: core.CodeNotFound, status: http.StatusNotFound, title: "Not found"},
		{code: core.CodeOperationPartialFailure, status: http.StatusInternalServerError, title: "Operation partial failure", logLevel: problemLogLevelError},
		{code: core.CodeRouteNotFound, status: http.StatusNotFound, title: "Not found"},
		{code: core.CodeValidationFailed, status: http.StatusBadRequest, title: "Validation failed"},
		{code: core.CodeUnsupportedFormat, status: http.StatusBadRequest, title: "Unsupported format"},
	}

	for _, tc := range cases {
		t.Run(tc.code, func(t *testing.T) {
			entry, ok := problemCatalogEntryFor(tc.code)
			if !ok {
				t.Fatalf("missing catalog entry for %s", tc.code)
			}
			if entry.status != tc.status {
				t.Fatalf("status = %d", entry.status)
			}
			if entry.title != tc.title {
				t.Fatalf("title = %q", entry.title)
			}
			if entry.retryable != tc.retryable {
				t.Fatalf("retryable = %t", entry.retryable)
			}
			if entry.logLevel != tc.logLevel {
				t.Fatalf("log level = %q", entry.logLevel)
			}
		})
	}
}
