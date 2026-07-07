package logging

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"regexp"
	"strings"
	"time"
)

const (
	plainTimeLayout = "2006/01/02 15:04:05"
	redactedValue   = "[REDACTED]"
)

type Logger struct {
	logger *log.Logger
}

func New(writer io.Writer) Logger {
	return Logger{
		logger: log.New(writer, "", 0),
	}
}

func (l Logger) Event(level string, message string, fields map[string]any) {
	entry := map[string]any{
		"level":   level,
		"message": message,
		"time":    time.Now().UTC().Format(time.RFC3339Nano),
	}
	for key, value := range fields {
		entry[key] = sanitizeField(key, value)
	}
	body, err := json.Marshal(entry)
	if err != nil {
		panic(fmt.Errorf("marshal log event: %w", err))
	}
	l.logger.Print(string(body))
}

func (l Logger) Printf(format string, args ...any) {
	values := append([]any{time.Now().UTC().Format(plainTimeLayout)}, args...)
	l.logger.Printf("mimipaste %s "+format, values...)
}

func (l Logger) Fatalf(format string, args ...any) {
	l.Printf(format, args...)
	os.Exit(1)
}

func sanitizeField(key string, value any) any {
	if isSensitiveKey(key) {
		return redactedValue
	}
	return sanitizeValue(value)
}

func sanitizeValue(value any) any {
	switch typed := value.(type) {
	case nil, bool, int, int8, int16, int32, int64:
		return typed
	case uint, uint8, uint16, uint32, uint64:
		return typed
	case float32, float64:
		return typed
	case string:
		return sanitizeString(typed)
	case error:
		return sanitizeString(typed.Error())
	case map[string]any:
		return sanitizeMap(typed)
	case []any:
		return sanitizeSlice(typed)
	default:
		return sanitizeString(fmt.Sprint(typed))
	}
}

func sanitizeMap(values map[string]any) map[string]any {
	result := make(map[string]any, len(values))
	for key, value := range values {
		result[key] = sanitizeField(key, value)
	}
	return result
}

func sanitizeSlice(values []any) []any {
	result := make([]any, 0, len(values))
	for _, value := range values {
		result = append(result, sanitizeValue(value))
	}
	return result
}

func isSensitiveKey(key string) bool {
	normalized := strings.NewReplacer("_", "", "-", "", ".", "").Replace(strings.ToLower(key))
	sensitiveMarkers := []string{"apikey", "authorization", "cookie", "credential", "password", "secret", "token"}
	for _, marker := range sensitiveMarkers {
		if strings.Contains(normalized, marker) {
			return true
		}
	}
	return false
}

func sanitizeString(value string) string {
	for _, pattern := range sensitiveValuePatterns {
		value = pattern.ReplaceAllString(value, "${1}"+redactedValue)
	}
	return value
}

var sensitiveValuePatterns = []*regexp.Regexp{
	regexp.MustCompile(`(?i)(api[_-]?key\s*[:=]\s*)[^\s,;"}]+`),
	regexp.MustCompile(`(?i)(authorization\s*[:=]\s*)(bearer\s+)?[^\s,;"}]+`),
	regexp.MustCompile(`(?i)(cookie\s*[:=]\s*)[^\s,;"}]+`),
	regexp.MustCompile(`(?i)(credential\s*[:=]\s*)[^\s,;"}]+`),
	regexp.MustCompile(`(?i)(password\s*[:=]\s*)[^\s,;"}]+`),
	regexp.MustCompile(`(?i)(secret\s*[:=]\s*)[^\s,;"}]+`),
	regexp.MustCompile(`(?i)(token\s*[:=]\s*)[^\s,;"}]+`),
}
