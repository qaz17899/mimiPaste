package configfile

import (
	"os"
	"path/filepath"

	"github.com/qaz17899/mimiPaste/server/internal/agent"
	"github.com/qaz17899/mimiPaste/server/internal/platform/filesystem"
)

type DefaultSource struct {
	AgentID string
	Name    string
	Path    string
	Format  string
	Content string
}

func DiscoverDefaultSources(fs filesystem.FileSystem) ([]DefaultSource, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return nil, err
	}
	candidates := defaultCandidates(home)
	sources := make([]DefaultSource, 0, len(candidates))
	for _, candidate := range candidates {
		content, ok := readCandidate(fs, candidate.Path)
		if ok {
			candidate.Content = content
			sources = append(sources, candidate)
		}
	}
	return sources, nil
}

func defaultCandidates(home string) []DefaultSource {
	return []DefaultSource{
		{AgentID: agent.BuiltInCodexID, Name: "原本 Codex 設定", Path: filepath.Join(home, ".codex", "config.toml"), Format: "toml"},
		{AgentID: agent.BuiltInClaudeID, Name: "Claude settings.json", Path: filepath.Join(home, ".claude", "settings.json"), Format: "json"},
		{AgentID: agent.BuiltInClaudeID, Name: "Claude .claude.json", Path: filepath.Join(home, ".claude.json"), Format: "json"},
	}
}

func readCandidate(fs filesystem.FileSystem, path string) (string, bool) {
	info, err := fs.Stat(path)
	if err != nil || info.IsDir() {
		return "", false
	}
	content, err := fs.ReadFile(path)
	if err != nil {
		return "", false
	}
	return string(content), true
}
