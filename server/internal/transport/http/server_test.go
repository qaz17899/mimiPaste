package httptransport

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/logging"
)

func TestSuccessResponsesIncludeRequestID(t *testing.T) {
	recorder, _ := serveTestAPI(t, nil, func(ctx *apiContext) error {
		return ctx.writeJSON(http.StatusOK, map[string]string{"status": "ok"})
	})

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d", recorder.Code)
	}
	if requestID := recorder.Header().Get(requestIDHeader); requestID == "" {
		t.Fatal("missing request id header")
	}
}

func TestErrorClassifierClassifiesErrorKinds(t *testing.T) {
	classifier := ErrorClassifier{}
	requestID := "req_test"
	for _, tc := range errorClassifierCases {
		t.Run(tc.name, func(t *testing.T) {
			classified := classifier.Classify(tc.err, requestID)
			problem := classified.Problem
			assertClassifiedProblem(t, problem, tc.code, tc.status, tc.detail)
			if classified.LogLevel != tc.logLevel {
				t.Fatalf("log level = %q", classified.LogLevel)
			}
			if problem.Retryable != tc.retryable {
				t.Fatalf("retryable = %t", problem.Retryable)
			}
		})
	}
}

type errorClassifierCase struct {
	name      string
	err       error
	code      string
	status    int
	detail    string
	logLevel  problemLogLevel
	retryable bool
}

var errorClassifierCases = []errorClassifierCase{
	{
		name: "domain validation",
		err: core.NewDetailedError(
			core.CodeInvalidInput,
			"標題不可空白。",
			map[string]any{"field": "title"},
		),
		code: core.CodeInvalidInput, status: http.StatusBadRequest,
		detail: "標題不可空白。",
	},
	{
		name: "unknown infrastructure",
		err:  errors.New("database password leaked internally"),
		code: core.CodeInternalError, status: http.StatusInternalServerError,
		detail: "操作失敗，請稍後再試。", logLevel: problemLogLevelError,
		retryable: true,
	},
	{
		name: "domain cause keeps safe detail and logs cause",
		err: core.NewErrorWithCause(
			core.CodeFileReadError,
			"無法讀取設定檔，請確認路徑與權限。",
			errors.New("permission denied"),
		),
		code: core.CodeFileReadError, status: http.StatusUnprocessableEntity,
		detail: "無法讀取設定檔，請確認路徑與權限。", logLevel: problemLogLevelError,
	},
	{
		name: "typed infrastructure",
		err: core.NewInfrastructureError(
			core.CodeFileReadError,
			"raw filesystem detail",
			errors.New("permission denied"),
		),
		code: core.CodeFileReadError, status: http.StatusUnprocessableEntity,
		detail: "操作失敗，請稍後再試。", logLevel: problemLogLevelError,
	},
}

func TestDomainErrorReturnsProblemDetails(t *testing.T) {
	recorder, _ := serveTestAPI(t, nil, func(*apiContext) error {
		return core.NewDetailedError(core.CodeInvalidInput, "標題不可空白。", map[string]any{
			"field": "title",
		})
	})

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusBadRequest)
	if problem.Code != core.CodeInvalidInput {
		t.Fatalf("code = %q", problem.Code)
	}
	if problem.Detail != "標題不可空白。" {
		t.Fatalf("detail = %q", problem.Detail)
	}
	if problem.Details["field"] != "title" {
		t.Fatalf("details = %#v", problem.Details)
	}
	assertRequestReference(t, recorder, problem)
}

func TestPartialFailureProblemIncludesRecoveryDetails(t *testing.T) {
	recorder, _ := serveTestAPI(t, nil, func(*apiContext) error {
		return core.NewDetailedError(core.CodeOperationPartialFailure, "套用狀態更新失敗。", map[string]any{
			"operation_id": "operation_1",
			"backup_id":    "backup_1",
			"guidance":     "請用這份備份還原。",
		})
	})

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusInternalServerError)
	assertRequestReference(t, recorder, problem)
	if problem.Code != core.CodeOperationPartialFailure {
		t.Fatalf("code = %q", problem.Code)
	}
	if problem.Details["operation_id"] != "operation_1" {
		t.Fatalf("operation id details = %#v", problem.Details)
	}
	if problem.Details["backup_id"] != "backup_1" {
		t.Fatalf("backup id details = %#v", problem.Details)
	}
	if problem.Details["guidance"] != "請用這份備份還原。" {
		t.Fatalf("guidance details = %#v", problem.Details)
	}
}

func TestUnknownErrorIsMaskedAndLoggedWithRequestID(t *testing.T) {
	var logs bytes.Buffer
	recorder, logger := serveTestAPI(t, &logs, func(*apiContext) error {
		return errors.New("database driver detail")
	})

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusInternalServerError)
	if problem.Code != core.CodeInternalError {
		t.Fatalf("code = %q", problem.Code)
	}
	if strings.Contains(problem.Detail, "database driver detail") {
		t.Fatalf("leaked internal detail: %q", problem.Detail)
	}
	event := readLogEvent(t, logger)
	assertLogField(t, event, "level", "error")
	assertLogField(t, event, "message", "problem")
	assertLogField(t, event, "requestId", recorder.Header().Get(requestIDHeader))
	assertLogField(t, event, "method", http.MethodGet)
	assertLogField(t, event, "path", "/api/test")
	assertLogField(t, event, "code", core.CodeInternalError)
	assertLogField(t, event, "type", "https://mimipaste.local/problems/internal-error")
	assertLogField(t, event, "status", float64(http.StatusInternalServerError))
	assertLogContains(t, stringField(t, event, "error"), "database driver detail")
}

func TestUnknownAppErrorCodeReturnsInternalProblemAndLogsOriginalCode(t *testing.T) {
	recorder, logger := serveTestAPI(t, &bytes.Buffer{}, func(*apiContext) error {
		return core.NewError("EXPERIMENTAL_ERROR", "unsafe experimental detail")
	})

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusInternalServerError)
	if problem.Code != core.CodeInternalError {
		t.Fatalf("code = %q", problem.Code)
	}
	if strings.Contains(problem.Detail, "unsafe experimental detail") {
		t.Fatalf("leaked unknown app error detail: %q", problem.Detail)
	}
	event := readLogEvent(t, logger)
	assertLogField(t, event, "originalCode", "EXPERIMENTAL_ERROR")
	assertLogField(t, event, "code", core.CodeInternalError)
}

func TestJSONEncodeFailureReturnsProblemDetails(t *testing.T) {
	var logs bytes.Buffer
	recorder, logger := serveTestAPI(t, &logs, func(ctx *apiContext) error {
		return ctx.writeJSON(http.StatusOK, map[string]any{"bad": func() {}})
	})

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusInternalServerError)
	if problem.Code != core.CodeInternalError {
		t.Fatalf("code = %q", problem.Code)
	}
	event := readLogEvent(t, logger)
	assertLogField(t, event, "requestId", recorder.Header().Get(requestIDHeader))
	assertLogContains(t, stringField(t, event, "cause"), "unsupported type")
}

func TestProblemLogsRedactSensitiveValues(t *testing.T) {
	_, logger := serveTestAPI(t, &bytes.Buffer{}, func(*apiContext) error {
		return errors.New("driver failed password=hunter2 token=token-secret-123 authorization=Bearer auth-secret-456")
	})

	event := readLogEvent(t, logger)
	encoded, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("marshal log event: %v", err)
	}
	for _, secret := range []string{"hunter2", "token-secret-123", "auth-secret-456"} {
		if strings.Contains(string(encoded), secret) {
			t.Fatalf("log leaked %q in %s", secret, string(encoded))
		}
	}
	assertLogContains(t, string(encoded), "[REDACTED]")
}

func TestLateHandlerErrorOverridesPreparedSuccessResponse(t *testing.T) {
	recorder, _ := serveTestAPI(t, nil, func(ctx *apiContext) error {
		if err := ctx.writeJSON(http.StatusOK, map[string]string{"status": "ok"}); err != nil {
			return err
		}
		return errors.New("late failure")
	})

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusInternalServerError)
	if strings.Contains(recorder.Body.String(), `"status":"ok"`) {
		t.Fatalf("committed success body before error: %s", recorder.Body.String())
	}
	if problem.Code != core.CodeInternalError {
		t.Fatalf("code = %q", problem.Code)
	}
}

func TestMethodNotAllowedReturnsProblemDetails(t *testing.T) {
	handler := serveTestMux()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/health", nil)

	handler.ServeHTTP(recorder, request)

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusMethodNotAllowed)
	assertRequestReference(t, recorder, problem)
	if problem.Code != core.CodeMethodNotAllowed {
		t.Fatalf("code = %q", problem.Code)
	}
	if allow := recorder.Header().Get(allowHeader); allow != "GET, HEAD" {
		t.Fatalf("allow = %q", allow)
	}
	methods, ok := problem.Details[methodNotAllowedDetailsKey].([]any)
	if !ok || len(methods) != 2 {
		t.Fatalf("allowed methods details = %#v", problem.Details)
	}
}

func TestMissingAPIRouteReturnsProblemDetails(t *testing.T) {
	handler := serveTestMux()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/missing", nil)

	handler.ServeHTTP(recorder, request)

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusNotFound)
	assertRequestReference(t, recorder, problem)
	if problem.Code != core.CodeRouteNotFound {
		t.Fatalf("code = %q", problem.Code)
	}
}

func TestAPIRootReturnsProblemDetails(t *testing.T) {
	handler := serveTestMux()
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api", nil)

	handler.ServeHTTP(recorder, request)

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusNotFound)
	assertRequestReference(t, recorder, problem)
	if problem.Code != core.CodeRouteNotFound {
		t.Fatalf("code = %q", problem.Code)
	}
}

func TestPanicRecoveryReturnsProblemDetails(t *testing.T) {
	var logs bytes.Buffer
	responder := newAPIResponder(logging.New(&logs))
	handler := http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		panic("boom")
	})
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/test", nil)

	withRequestID(withPanicRecovery(handler, responder)).ServeHTTP(recorder, request)

	problem := readProblem(t, recorder.Body.Bytes())
	assertProblemHeader(t, recorder, http.StatusInternalServerError)
	if problem.Code != core.CodeInternalError {
		t.Fatalf("code = %q", problem.Code)
	}
	assertRequestReference(t, recorder, problem)
	event := readLogEvent(t, logs.String())
	assertLogField(t, event, "message", "panic_recovered")
	assertLogField(t, event, "requestId", problem.RequestID)
	assertLogField(t, event, "method", http.MethodGet)
	assertLogField(t, event, "path", "/api/test")
	assertLogField(t, event, "panic", "boom")
	assertLogContains(t, stringField(t, event, "stack"), "goroutine")
}

func serveTestAPI(
	t *testing.T,
	logs *bytes.Buffer,
	handler apiHandler,
) (*httptest.ResponseRecorder, string) {
	t.Helper()
	if logs == nil {
		logs = &bytes.Buffer{}
	}
	responder := newAPIResponder(logging.New(logs))
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/api/test", nil)
	withRequestID(responder.handle(handler)).ServeHTTP(recorder, request)
	return recorder, logs.String()
}

func serveTestMux() http.Handler {
	responder := newAPIResponder(logging.New(&bytes.Buffer{}))
	mux := http.NewServeMux()
	routes := newAPIRouteRegistrar(mux, responder)
	routes.Handle(http.MethodGet, "/api/health", responder.handleHealth)
	mux.HandleFunc("/api", responder.handle(routes.handleMissingAPI))
	mux.HandleFunc("/api/", responder.handle(routes.handleMissingAPI))
	return withRequestID(mux)
}

func readProblem(t *testing.T, body []byte) ProblemDetails {
	t.Helper()
	var problem ProblemDetails
	if err := json.Unmarshal(body, &problem); err != nil {
		t.Fatalf("decode problem body: %v", err)
	}
	return problem
}

func assertProblemHeader(t *testing.T, recorder *httptest.ResponseRecorder, status int) {
	t.Helper()
	if recorder.Code != status {
		t.Fatalf("status = %d", recorder.Code)
	}
	if contentType := recorder.Header().Get("Content-Type"); contentType != problemContentType {
		t.Fatalf("content type = %q", contentType)
	}
}

func assertRequestReference(
	t *testing.T,
	recorder *httptest.ResponseRecorder,
	problem ProblemDetails,
) {
	t.Helper()
	requestID := recorder.Header().Get(requestIDHeader)
	if requestID == "" {
		t.Fatal("missing request id header")
	}
	if problem.RequestID != requestID {
		t.Fatalf("request id mismatch: body=%q header=%q", problem.RequestID, requestID)
	}
	if problem.Instance != problemInstanceURN+requestID {
		t.Fatalf("instance = %q", problem.Instance)
	}
}

func assertClassifiedProblem(
	t *testing.T,
	problem ProblemDetails,
	code string,
	status int,
	detail string,
) {
	t.Helper()
	if problem.Code != code {
		t.Fatalf("code = %q", problem.Code)
	}
	if problem.Status != status {
		t.Fatalf("status = %d", problem.Status)
	}
	if problem.Detail != detail {
		t.Fatalf("detail = %q", problem.Detail)
	}
}

func assertLogContains(t *testing.T, logs string, value string) {
	t.Helper()
	if !strings.Contains(logs, value) {
		t.Fatalf("log %q does not contain %q", logs, value)
	}
}

func readLogEvent(t *testing.T, logs string) map[string]any {
	t.Helper()
	var event map[string]any
	line := strings.Split(strings.TrimSpace(logs), "\n")[0]
	if err := json.Unmarshal([]byte(line), &event); err != nil {
		t.Fatalf("decode log event: %v: %q", err, logs)
	}
	return event
}

func assertLogField(t *testing.T, event map[string]any, key string, want any) {
	t.Helper()
	if event[key] != want {
		t.Fatalf("log field %s = %#v, want %#v", key, event[key], want)
	}
}

func stringField(t *testing.T, event map[string]any, key string) string {
	t.Helper()
	value, ok := event[key].(string)
	if !ok {
		t.Fatalf("log field %s = %#v", key, event[key])
	}
	return value
}
