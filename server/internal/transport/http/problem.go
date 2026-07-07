package httptransport

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/core"
)

const (
	problemContentType = "application/problem+json"
	jsonContentType    = "application/json"
	allowHeader        = "Allow"
	requestIDHeader    = "X-Request-Id"
	requestIDPrefix    = "req_"
	problemTypeBase    = "https://mimipaste.local/problems/"
	problemInstanceURN = "urn:mimipaste:request:"

	methodNotAllowedDetailsKey = "allowedMethods"
)

type requestIDKey struct{}

type apiHandler func(*apiContext) error

type apiContext struct {
	request   *http.Request
	responder apiResponder
	response  *apiResponse
}

type apiResponse struct {
	status      int
	contentType string
	body        []byte
}

type ProblemDetails struct {
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Status    int            `json:"status"`
	Detail    string         `json:"detail"`
	Instance  string         `json:"instance"`
	Code      string         `json:"code"`
	RequestID string         `json:"requestId"`
	Retryable bool           `json:"retryable"`
	Details   map[string]any `json:"details"`
}

type ErrorClassifier struct{}

type ClassifiedError struct {
	Problem      ProblemDetails
	LogLevel     problemLogLevel
	Cause        error
	Headers      http.Header
	OriginalCode string
}

type problemLogLevel string

const (
	problemLogLevelNone  problemLogLevel = ""
	problemLogLevelError problemLogLevel = "error"
)

func (r apiResponder) handle(handler apiHandler) http.HandlerFunc {
	return func(writer http.ResponseWriter, request *http.Request) {
		ctx := &apiContext{request: request, responder: r}
		if err := handler(ctx); err != nil {
			r.writeProblem(writer, request, err)
			return
		}
		if err := ctx.commitResponse(writer); err != nil {
			r.writeProblem(writer, request, err)
		}
	}
}

func (ctx *apiContext) decodeJSON(target any) error {
	if err := json.NewDecoder(ctx.request.Body).Decode(target); err != nil {
		return core.NewError(core.CodeInvalidInput, "資料格式有誤，請重新確認。")
	}
	return nil
}

func (ctx *apiContext) noContent() error {
	return ctx.setResponse(http.StatusNoContent, "", nil)
}

func (ctx *apiContext) pathValue(key string) string {
	return ctx.request.PathValue(key)
}

func (ctx *apiContext) writeJSON(status int, payload any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return core.NewInfrastructureError(core.CodeInternalError, "操作失敗，請稍後再試。", err)
	}
	return ctx.setResponse(status, jsonContentType, append(body, '\n'))
}

func (ctx *apiContext) setResponse(status int, contentType string, body []byte) error {
	if ctx.response != nil {
		return core.NewInfrastructureError(
			core.CodeInternalError,
			"操作失敗，請稍後再試。",
			errors.New("api handler attempted to set multiple responses"),
		)
	}
	ctx.response = &apiResponse{status: status, contentType: contentType, body: body}
	return nil
}

func (ctx *apiContext) commitResponse(writer http.ResponseWriter) error {
	if ctx.response == nil {
		return core.NewInfrastructureError(
			core.CodeInternalError,
			"操作失敗，請稍後再試。",
			errors.New("api handler completed without a response"),
		)
	}
	if ctx.response.contentType != "" {
		writer.Header().Set("Content-Type", ctx.response.contentType)
	}
	writer.WriteHeader(ctx.response.status)
	if len(ctx.response.body) == 0 {
		return nil
	}
	if _, err := writer.Write(ctx.response.body); err != nil {
		ctx.responder.logger.Event("error", "response_write_failed", errorLogFields(ctx.request, err))
	}
	return nil
}

func (c ErrorClassifier) Classify(err error, requestID string) ClassifiedError {
	appErr, originalCode := c.catalogedAppError(err)
	entry := mustProblemCatalogEntry(appErr.Code)
	return ClassifiedError{
		Problem: ProblemDetails{
			Type:      problemTypeForCode(appErr.Code),
			Title:     entry.title,
			Status:    entry.status,
			Detail:    detailForClient(appErr),
			Instance:  problemInstanceURN + requestID,
			Code:      appErr.Code,
			RequestID: requestID,
			Retryable: entry.retryable,
			Details:   detailsForClient(appErr),
		},
		LogLevel:     logLevelFor(appErr, entry),
		Cause:        appErr.Cause,
		Headers:      headersFor(appErr),
		OriginalCode: originalCode,
	}
}

func logLevelFor(err *core.AppError, entry problemCatalogEntry) problemLogLevel {
	if err.Kind == core.ErrorKindInfrastructure {
		return problemLogLevelError
	}
	return entry.logLevel
}

func (c ErrorClassifier) appError(err error) *core.AppError {
	var appErr *core.AppError
	if errors.As(err, &appErr) {
		return appErr
	}
	return core.NewInfrastructureError(core.CodeInternalError, "操作失敗，請稍後再試。", err)
}

func (c ErrorClassifier) catalogedAppError(err error) (*core.AppError, string) {
	appErr := c.appError(err)
	if _, ok := problemCatalogEntryFor(appErr.Code); ok {
		return appErr, ""
	}
	return core.NewInfrastructureError(
		core.CodeInternalError,
		"操作失敗，請稍後再試。",
		appErr,
	), appErr.Code
}

func (r apiResponder) writeProblem(writer http.ResponseWriter, request *http.Request, err error) {
	requestID := requestIDFrom(request)
	classified := r.classifier.Classify(err, requestID)
	r.logProblem(request, err, classified)
	problem := classified.Problem
	body, marshalErr := json.Marshal(problem)
	if marshalErr != nil {
		r.logger.Event("error", "problem_encode_failed", errorLogFields(request, marshalErr))
		classified = r.classifier.Classify(marshalErr, requestID)
		problem = classified.Problem
		body = mustMarshalProblem(problem)
	}
	writer.Header().Set("Content-Type", problemContentType)
	setHeaders(writer.Header(), classified.Headers)
	writer.WriteHeader(problem.Status)
	if _, writeErr := writer.Write(append(body, '\n')); writeErr != nil {
		r.logger.Event("error", "problem_write_failed", errorLogFields(request, writeErr))
	}
}

func (r apiResponder) logProblem(request *http.Request, err error, classified ClassifiedError) {
	if classified.LogLevel == problemLogLevelNone {
		return
	}
	r.logger.Event(string(classified.LogLevel), "problem", problemLogFields(request, err, classified))
}

func withRequestID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		requestID := requestIDPrefix + strings.ReplaceAll(core.NewID(), "-", "")
		writer.Header().Set(requestIDHeader, requestID)
		ctx := context.WithValue(request.Context(), requestIDKey{}, requestID)
		next.ServeHTTP(writer, request.WithContext(ctx))
	})
}

func withPanicRecovery(next http.Handler, responder apiResponder) http.Handler {
	return http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		recorder := &statusRecorder{ResponseWriter: writer}
		defer func() {
			if recovered := recover(); recovered != nil {
				responder.logPanic(request, recovered)
				if !recorder.wroteHeader {
					err := core.NewInfrastructureError(
						core.CodeInternalError,
						"操作失敗，請稍後再試。",
						fmt.Errorf("panic: %v", recovered),
					)
					responder.writeProblem(writer, request, err)
				}
			}
		}()
		next.ServeHTTP(recorder, request)
	})
}

func (r apiResponder) logPanic(request *http.Request, recovered any) {
	fields := requestLogFields(request)
	fields["panic"] = recovered
	fields["stack"] = string(debug.Stack())
	r.logger.Event("error", "panic_recovered", fields)
}

func mustMarshalProblem(problem ProblemDetails) []byte {
	body, err := json.Marshal(problem)
	if err != nil {
		panic(err)
	}
	return body
}

func requestIDFrom(request *http.Request) string {
	if request == nil {
		return requestIDPrefix + "missing"
	}
	value, ok := request.Context().Value(requestIDKey{}).(string)
	if !ok || value == "" {
		return requestIDPrefix + "missing"
	}
	return value
}

func requestMethodFrom(request *http.Request) string {
	if request == nil || request.Method == "" {
		return "unknown"
	}
	return request.Method
}

func requestPathFrom(request *http.Request) string {
	if request == nil || request.URL == nil || request.URL.Path == "" {
		return "unknown"
	}
	return request.URL.Path
}

func detailForClient(err *core.AppError) string {
	if err.Kind == core.ErrorKindInfrastructure {
		return "操作失敗，請稍後再試。"
	}
	return err.Detail
}

func detailsForClient(err *core.AppError) map[string]any {
	if err.Kind == core.ErrorKindInfrastructure {
		return map[string]any{}
	}
	if err.Details == nil {
		return map[string]any{}
	}
	return copyDetails(err.Details)
}

func copyDetails(details map[string]any) map[string]any {
	result := make(map[string]any, len(details))
	for key, value := range details {
		result[key] = value
	}
	return result
}

func problemTypeForCode(code string) string {
	return problemTypeBase + strings.ToLower(strings.ReplaceAll(code, "_", "-"))
}

func headersFor(err *core.AppError) http.Header {
	if err.Code != core.CodeMethodNotAllowed {
		return nil
	}
	allowedMethods, ok := err.Details[methodNotAllowedDetailsKey].([]string)
	if !ok || len(allowedMethods) == 0 {
		return nil
	}
	headers := http.Header{}
	headers.Set(allowHeader, strings.Join(allowedMethods, ", "))
	return headers
}

func errorLogFields(request *http.Request, err error) map[string]any {
	fields := requestLogFields(request)
	fields["error"] = err
	return fields
}

func problemLogFields(request *http.Request, err error, classified ClassifiedError) map[string]any {
	problem := classified.Problem
	fields := requestLogFields(request)
	fields["code"] = problem.Code
	fields["error"] = err
	fields["status"] = problem.Status
	fields["type"] = problem.Type
	if classified.Cause != nil {
		fields["cause"] = classified.Cause
	}
	if classified.OriginalCode != "" {
		fields["originalCode"] = classified.OriginalCode
	}
	return fields
}

func requestLogFields(request *http.Request) map[string]any {
	return map[string]any{
		"method":    requestMethodFrom(request),
		"path":      requestPathFrom(request),
		"requestId": requestIDFrom(request),
	}
}

func setHeaders(target http.Header, source http.Header) {
	for key, values := range source {
		for _, value := range values {
			target.Add(key, value)
		}
	}
}

type statusRecorder struct {
	http.ResponseWriter
	wroteHeader bool
}

func (r *statusRecorder) WriteHeader(status int) {
	r.wroteHeader = true
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(body []byte) (int, error) {
	if !r.wroteHeader {
		r.wroteHeader = true
	}
	return r.ResponseWriter.Write(body)
}

func (r *statusRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
}
