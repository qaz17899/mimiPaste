package logging

import (
	"bytes"
	"encoding/json"
	"strings"
	"testing"
)

func TestEventWritesJSONLog(t *testing.T) {
	var logs bytes.Buffer
	logger := New(&logs)

	logger.Event("error", "problem", map[string]any{
		"code":      "INTERNAL_ERROR",
		"requestId": "req_test",
		"status":    500,
	})

	event := readEvent(t, logs.String())
	if event["level"] != "error" {
		t.Fatalf("level = %#v", event["level"])
	}
	if event["message"] != "problem" {
		t.Fatalf("message = %#v", event["message"])
	}
	if event["requestId"] != "req_test" {
		t.Fatalf("requestId = %#v", event["requestId"])
	}
}

func TestEventRedactsSensitiveFields(t *testing.T) {
	var logs bytes.Buffer
	logger := New(&logs)

	logger.Event("error", "problem", map[string]any{
		"apiKey": "plain-key",
		"error":  "failed password=hunter2 token=token-secret-123 authorization=Bearer auth-secret-456",
		"nested": map[string]any{"secret": "plain-secret"},
	})

	event := readEvent(t, logs.String())
	encoded := mustJSON(t, event)
	for _, secret := range []string{"plain-key", "hunter2", "token-secret-123", "auth-secret-456", "plain-secret"} {
		if strings.Contains(encoded, secret) {
			t.Fatalf("log leaked %q in %s", secret, encoded)
		}
	}
	if !strings.Contains(encoded, redactedValue) {
		t.Fatalf("log did not contain redaction marker: %s", encoded)
	}
}

func readEvent(t *testing.T, line string) map[string]any {
	t.Helper()
	var event map[string]any
	if err := json.Unmarshal([]byte(strings.TrimSpace(line)), &event); err != nil {
		t.Fatalf("decode log event: %v: %q", err, line)
	}
	return event
}

func mustJSON(t *testing.T, value any) string {
	t.Helper()
	body, err := json.Marshal(value)
	if err != nil {
		t.Fatalf("marshal event: %v", err)
	}
	return string(body)
}
