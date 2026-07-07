package httptransport

import (
	"net/http"

	"github.com/qaz17899/mimiPaste/server/internal/core"
)

type problemCatalogEntry struct {
	status    int
	title     string
	retryable bool
	logLevel  problemLogLevel
}

var problemCatalog = map[string]problemCatalogEntry{
	core.CodeConflict: {
		status: http.StatusConflict,
		title:  "Conflict",
	},
	core.CodeConfigParseError: {
		status: http.StatusBadRequest,
		title:  "Config parse error",
	},
	core.CodeFileReadError: {
		status:   http.StatusUnprocessableEntity,
		title:    "File read error",
		logLevel: problemLogLevelError,
	},
	core.CodeFileWriteError: {
		status:   http.StatusUnprocessableEntity,
		title:    "File write error",
		logLevel: problemLogLevelError,
	},
	core.CodeInvalidInput: {
		status: http.StatusBadRequest,
		title:  "Invalid input",
	},
	core.CodeInternalError: {
		status:    http.StatusInternalServerError,
		title:     "Internal error",
		retryable: true,
		logLevel:  problemLogLevelError,
	},
	core.CodeMethodNotAllowed: {
		status: http.StatusMethodNotAllowed,
		title:  "Method not allowed",
	},
	core.CodeNotFound: {
		status: http.StatusNotFound,
		title:  "Not found",
	},
	core.CodeOperationPartialFailure: {
		status:   http.StatusInternalServerError,
		title:    "Operation partial failure",
		logLevel: problemLogLevelError,
	},
	core.CodeRouteNotFound: {
		status: http.StatusNotFound,
		title:  "Not found",
	},
	core.CodeValidationFailed: {
		status: http.StatusBadRequest,
		title:  "Validation failed",
	},
	core.CodeUnsupportedFormat: {
		status: http.StatusBadRequest,
		title:  "Unsupported format",
	},
}

func problemCatalogEntryFor(code string) (problemCatalogEntry, bool) {
	entry, ok := problemCatalog[code]
	return entry, ok
}

func mustProblemCatalogEntry(code string) problemCatalogEntry {
	entry, ok := problemCatalogEntryFor(code)
	if !ok {
		panic("missing problem catalog entry for " + code)
	}
	return entry
}
