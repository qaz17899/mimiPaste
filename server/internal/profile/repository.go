package profile

import "context"

type Repository interface {
	CreateProfile(ctx context.Context, item Profile) (Profile, error)
	DeleteProfile(ctx context.Context, id string) error
	EnsureProfile(ctx context.Context, item Profile) (Profile, error)
	GetProfile(ctx context.Context, id string) (Profile, error)
	ListProfiles(ctx context.Context, options ListOptions) ([]Profile, error)
	UpdateProfile(ctx context.Context, item Profile) (Profile, error)
}
