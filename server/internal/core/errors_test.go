package core

import "testing"

func TestNewDetailedErrorCopiesDetails(t *testing.T) {
	details := map[string]any{"field": "title"}

	err := NewDetailedError(CodeInvalidInput, "標題不可空白。", details)
	details["field"] = "content"

	if err.Details["field"] != "title" {
		t.Fatalf("details were mutated through caller map: %#v", err.Details)
	}
}
