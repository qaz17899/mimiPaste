package profile

import (
	"context"
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

func (s *Service) List(ctx context.Context, options ListOptions) ([]Profile, error) {
	options.AgentID = strings.TrimSpace(options.AgentID)
	return s.repo.ListProfiles(ctx, options)
}

func (s *Service) Get(ctx context.Context, id string) (Profile, error) {
	return s.repo.GetProfile(ctx, id)
}

func (s *Service) Create(ctx context.Context, input SaveInput) (Profile, error) {
	clean, err := normalizeInput(input)
	if err != nil {
		return Profile{}, err
	}
	now := s.clock.Now()
	item := Profile{
		ID: core.NewID(), AgentID: clean.AgentID, Name: clean.Name,
		Description: clean.Description, Format: clean.Format, Content: clean.Content,
		CreatedAt: now, UpdatedAt: now,
	}
	return s.repo.CreateProfile(ctx, item)
}

func (s *Service) Update(ctx context.Context, id string, input SaveInput) (Profile, error) {
	clean, err := normalizeInput(input)
	if err != nil {
		return Profile{}, err
	}
	item, err := s.repo.GetProfile(ctx, id)
	if err != nil {
		return Profile{}, err
	}
	item.AgentID = clean.AgentID
	item.Name = clean.Name
	item.Description = clean.Description
	item.Format = clean.Format
	item.Content = clean.Content
	item.UpdatedAt = s.clock.Now()
	return s.repo.UpdateProfile(ctx, item)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	return s.repo.DeleteProfile(ctx, id)
}

func normalizeInput(input SaveInput) (SaveInput, error) {
	input.AgentID = strings.TrimSpace(input.AgentID)
	input.Name = strings.TrimSpace(input.Name)
	input.Description = strings.TrimSpace(input.Description)
	input.Format = strings.ToLower(strings.TrimSpace(input.Format))
	if input.AgentID == "" || input.Name == "" || input.Content == "" {
		return SaveInput{}, core.NewError(core.CodeInvalidInput, "設定檔資料不完整。")
	}
	if input.Format != "toml" && input.Format != "json" && input.Format != "text" {
		return SaveInput{}, core.NewError(core.CodeUnsupportedFormat, "設定檔格式尚未支援。")
	}
	return input, nil
}
