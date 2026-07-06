package agent

import (
	"context"
	"path/filepath"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/clock"
)

type Service struct {
	repo  Repository
	clock clock.Clock
}

func NewService(repo Repository, clock clock.Clock) *Service {
	return &Service{repo: repo, clock: clock}
}

func (s *Service) EnsureBuiltIns(ctx context.Context) error {
	now := s.clock.Now()
	agents := []Agent{
		{ID: BuiltInCodexID, Name: "Codex", Kind: KindBuiltIn, CreatedAt: now},
		{ID: BuiltInClaudeID, Name: "Claude", Kind: KindBuiltIn, CreatedAt: now},
	}
	for _, item := range agents {
		if err := s.repo.EnsureBuiltInAgent(ctx, item); err != nil {
			return err
		}
	}
	return nil
}

func (s *Service) List(ctx context.Context) ([]Agent, error) {
	return s.repo.ListAgents(ctx)
}

func (s *Service) Create(ctx context.Context, input CreateAgentInput) (Agent, error) {
	name := strings.TrimSpace(input.Name)
	if name == "" {
		return Agent{}, core.NewError(core.CodeInvalidInput, "Agent 名稱不可空白。")
	}
	item := Agent{ID: core.NewID(), Name: name, Kind: KindCustom, CreatedAt: s.clock.Now()}
	return s.repo.CreateAgent(ctx, item)
}

func (s *Service) ListConfigSources(ctx context.Context) ([]ConfigSource, error) {
	return s.repo.ListConfigSources(ctx)
}

func (s *Service) GetConfigSource(ctx context.Context, id string) (ConfigSource, error) {
	return s.repo.GetConfigSource(ctx, id)
}

func (s *Service) CreateConfigSource(
	ctx context.Context,
	input CreateConfigSourceInput,
) (ConfigSource, error) {
	item, err := s.normalizeConfigSource(input)
	if err != nil {
		return ConfigSource{}, err
	}
	return s.repo.CreateConfigSource(ctx, item)
}

func (s *Service) normalizeConfigSource(input CreateConfigSourceInput) (ConfigSource, error) {
	path := filepath.Clean(strings.TrimSpace(input.Path))
	if strings.TrimSpace(input.Name) == "" {
		return ConfigSource{}, core.NewError(core.CodeInvalidInput, "設定檔名稱不可空白。")
	}
	if strings.TrimSpace(input.AgentID) == "" {
		return ConfigSource{}, core.NewError(core.CodeInvalidInput, "請選擇 Agent 類型。")
	}
	if path == "." || !filepath.IsAbs(path) {
		return ConfigSource{}, core.NewError(core.CodeInvalidInput, "設定檔路徑必須是完整路徑。")
	}
	format, err := normalizeFormat(input.Format)
	if err != nil {
		return ConfigSource{}, err
	}
	now := s.clock.Now()
	return ConfigSource{
		ID: core.NewID(), AgentID: strings.TrimSpace(input.AgentID),
		Name: strings.TrimSpace(input.Name), Path: path, Format: format,
		CreatedAt: now, UpdatedAt: now,
	}, nil
}

func normalizeFormat(format string) (string, error) {
	switch strings.ToLower(strings.TrimSpace(format)) {
	case "toml", "json", "text":
		return strings.ToLower(strings.TrimSpace(format)), nil
	default:
		return "", core.NewError(core.CodeUnsupportedFormat, "設定檔格式尚未支援。")
	}
}
