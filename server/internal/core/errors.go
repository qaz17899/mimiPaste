package core

import "fmt"

const (
	CodeConflict                = "CONFLICT"
	CodeConfigParseError        = "CONFIG_PARSE_ERROR"
	CodeFileReadError           = "FILE_READ_ERROR"
	CodeFileWriteError          = "FILE_WRITE_ERROR"
	CodeInvalidInput            = "INVALID_INPUT"
	CodeInternalError           = "INTERNAL_ERROR"
	CodeMethodNotAllowed        = "METHOD_NOT_ALLOWED"
	CodeNotFound                = "NOT_FOUND"
	CodeOperationPartialFailure = "OPERATION_PARTIAL_FAILURE"
	CodeRouteNotFound           = "ROUTE_NOT_FOUND"
	CodeValidationFailed        = "VALIDATION_FAILED"
	CodeUnsupportedFormat       = "UNSUPPORTED_FORMAT"
)

type ErrorKind string

const (
	ErrorKindDomain         ErrorKind = "domain"
	ErrorKindInfrastructure ErrorKind = "infrastructure"
)

type AppError struct {
	Code    string
	Detail  string
	Details map[string]any
	Kind    ErrorKind
	Cause   error
}

type errorOption func(*AppError)

func (e *AppError) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Detail)
}

func (e *AppError) Unwrap() error {
	return e.Cause
}

func NewError(code string, detail string) *AppError {
	return newAppError(code, detail)
}

func NewDetailedError(code string, detail string, details map[string]any) *AppError {
	return newAppError(code, detail, withDetails(details))
}

func NewDetailedErrorWithCause(
	code string,
	detail string,
	details map[string]any,
	cause error,
) *AppError {
	return newAppError(code, detail, withDetails(details), withCause(cause))
}

func NewErrorWithCause(code string, detail string, cause error) *AppError {
	return newAppError(code, detail, withCause(cause))
}

func NewInfrastructureError(code string, detail string, cause error) *AppError {
	return newAppError(code, detail, withKind(ErrorKindInfrastructure), withCause(cause))
}

func withCause(cause error) errorOption {
	return func(err *AppError) {
		err.Cause = cause
	}
}

func withDetails(details map[string]any) errorOption {
	return func(err *AppError) {
		err.Details = detailsOrEmpty(details)
	}
}

func withKind(kind ErrorKind) errorOption {
	return func(err *AppError) {
		err.Kind = kind
	}
}

func newAppError(code string, detail string, options ...errorOption) *AppError {
	err := &AppError{
		Code:    code,
		Detail:  detail,
		Details: map[string]any{},
		Kind:    kindForCode(code),
	}
	for _, option := range options {
		option(err)
	}
	return err
}

func kindForCode(code string) ErrorKind {
	if code == CodeInternalError {
		return ErrorKindInfrastructure
	}
	return ErrorKindDomain
}

func detailsOrEmpty(details map[string]any) map[string]any {
	result := map[string]any{}
	for key, value := range details {
		result[key] = value
	}
	return result
}
