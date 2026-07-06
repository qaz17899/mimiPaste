package core

import "fmt"

const (
	CodeConflict          = "CONFLICT"
	CodeConfigParseError  = "CONFIG_PARSE_ERROR"
	CodeFileReadError     = "FILE_READ_ERROR"
	CodeFileWriteError    = "FILE_WRITE_ERROR"
	CodeInvalidInput      = "INVALID_INPUT"
	CodeNotFound          = "NOT_FOUND"
	CodeRouteNotFound     = "ROUTE_NOT_FOUND"
	CodeValidationFailed  = "VALIDATION_FAILED"
	CodeDatabaseError     = "DATABASE_ERROR"
	CodeUnsupportedFormat = "UNSUPPORTED_FORMAT"
)

type AppError struct {
	Code    string
	Message string
	Details map[string]any
}

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func NewError(code string, message string) *AppError {
	return &AppError{Code: code, Message: message, Details: map[string]any{}}
}

func NewDetailedError(code string, message string, details map[string]any) *AppError {
	return &AppError{Code: code, Message: message, Details: details}
}
