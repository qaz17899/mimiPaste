package backup

import "context"

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context) ([]Backup, error) {
	return s.repo.ListBackups(ctx)
}

func (s *Service) Get(ctx context.Context, id string) (Backup, error) {
	return s.repo.GetBackup(ctx, id)
}
