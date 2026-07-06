package logging

import (
	"io"
	"log"
)

type Logger struct {
	logger *log.Logger
}

func New(writer io.Writer) Logger {
	return Logger{
		logger: log.New(writer, "mimipaste ", log.LstdFlags|log.LUTC),
	}
}

func (l Logger) Printf(format string, args ...any) {
	l.logger.Printf(format, args...)
}

func (l Logger) Fatalf(format string, args ...any) {
	l.logger.Fatalf(format, args...)
}
