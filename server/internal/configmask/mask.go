package configmask

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/pelletier/go-toml/v2"
)

const MaskValue = "********"

var assignmentPattern = regexp.MustCompile(`(?i)(["']?[a-z0-9_.-]*(?:api[_-]?key|authorization|credential|password|secret|token|key)[a-z0-9_.-]*["']?\s*[:=]\s*)(["'][^"']*["']|[^,\n\r#]+)`)

type Result struct {
	Content string
	Masked  bool
}

func MaskContent(format string, content string) Result {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "json":
		return maskJSON(content)
	case "toml":
		return maskTOML(content)
	default:
		return maskAssignments(content)
	}
}

func IsSensitiveKey(key string) bool {
	normalized := strings.NewReplacer("_", "", "-", "", ".", "", " ", "").Replace(strings.ToLower(key))
	markers := []string{"apikey", "authorization", "credential", "password", "secret", "token", "key"}
	for _, marker := range markers {
		if strings.Contains(normalized, marker) {
			return true
		}
	}
	return false
}

func maskJSON(content string) Result {
	var data any
	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return maskAssignments(content)
	}
	masked, changed := maskValue(data, "")
	if !changed {
		return Result{Content: content}
	}
	bytes, err := json.MarshalIndent(masked, "", "  ")
	if err != nil {
		return maskAssignments(content)
	}
	return Result{Content: string(bytes), Masked: true}
}

func maskTOML(content string) Result {
	var data map[string]any
	if err := toml.Unmarshal([]byte(content), &data); err != nil {
		return maskAssignments(content)
	}
	masked, changed := maskValue(data, "")
	if !changed {
		return Result{Content: content}
	}
	bytes, err := toml.Marshal(masked)
	if err != nil {
		return maskAssignments(content)
	}
	return Result{Content: string(bytes), Masked: true}
}

func maskValue(value any, key string) (any, bool) {
	if IsSensitiveKey(key) {
		return MaskValue, true
	}
	switch typed := value.(type) {
	case map[string]any:
		return maskMap(typed)
	case []any:
		return maskSlice(typed)
	default:
		return value, false
	}
}

func maskMap(values map[string]any) (map[string]any, bool) {
	masked := map[string]any{}
	changed := false
	for key, value := range values {
		next, maskedValue := maskValue(value, key)
		masked[key] = next
		changed = changed || maskedValue
	}
	return masked, changed
}

func maskSlice(values []any) ([]any, bool) {
	masked := make([]any, 0, len(values))
	changed := false
	for _, value := range values {
		next, maskedValue := maskValue(value, "")
		masked = append(masked, next)
		changed = changed || maskedValue
	}
	return masked, changed
}

func maskAssignments(content string) Result {
	masked := assignmentPattern.ReplaceAllString(content, "${1}\""+MaskValue+"\"")
	return Result{Content: masked, Masked: masked != content}
}
