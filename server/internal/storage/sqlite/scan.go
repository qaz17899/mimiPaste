package sqlite

import (
	"database/sql"
	"time"
)

func sqlTime(value time.Time) string {
	return value.UTC().Format(time.RFC3339Nano)
}

func parseTime(value string) time.Time {
	parsed, err := time.Parse(time.RFC3339Nano, value)
	if err != nil {
		return time.Time{}
	}
	return parsed
}

func nullableTime(value sql.NullString) *time.Time {
	if !value.Valid {
		return nil
	}
	parsed := parseTime(value.String)
	return &parsed
}

func stringPointer(value sql.NullString) *string {
	if !value.Valid {
		return nil
	}
	return &value.String
}
