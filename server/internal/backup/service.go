package backup

import (
	"context"
	"path/filepath"
	"strings"

	"github.com/qaz17899/mimiPaste/server/internal/configmask"
	"github.com/qaz17899/mimiPaste/server/internal/core"
	"github.com/qaz17899/mimiPaste/server/internal/platform/filesystem"
)

const (
	ContentDirPerm  = 0o700
	ContentFilePerm = 0o600
	defaultFileExt  = ".txt"
)

type Service struct {
	fs       filesystem.FileSystem
	repo     Repository
	settings SettingsRepository
}

func NewService(
	repo Repository,
	settings SettingsRepository,
	fs filesystem.FileSystem,
) *Service {
	return &Service{fs: fs, repo: repo, settings: settings}
}

func (s *Service) List(ctx context.Context) ([]Backup, error) {
	items, err := s.repo.ListBackups(ctx)
	if err != nil {
		return nil, err
	}
	return hydrateBackups(s.fs, items)
}

func (s *Service) Get(ctx context.Context, id string) (Backup, error) {
	item, err := s.repo.GetBackup(ctx, id)
	if err != nil {
		return Backup{}, err
	}
	return HydrateContent(s.fs, item)
}

func (s *Service) SetPinned(ctx context.Context, id string, pinned bool) (Backup, error) {
	item, err := s.repo.UpdateBackupPinned(ctx, id, pinned)
	if err != nil {
		return Backup{}, err
	}
	return HydrateContent(s.fs, item)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	item, err := s.repo.GetBackup(ctx, id)
	if err != nil {
		return err
	}
	return s.deleteBackup(ctx, item)
}

func (s *Service) Export(ctx context.Context, id string) (Export, error) {
	item, err := s.Get(ctx, id)
	if err != nil {
		return Export{}, err
	}
	return Export{Filename: exportFilename(item), Content: item.Content}, nil
}

func (s *Service) Prune(ctx context.Context, keep int) (PruneResult, error) {
	if keep < 0 {
		return PruneResult{}, core.NewError(core.CodeInvalidInput, "保留數量不可小於 0。")
	}
	items, err := s.repo.ListBackups(ctx)
	if err != nil {
		return PruneResult{}, err
	}
	return s.pruneBackups(ctx, items, keep)
}

func (s *Service) EnsureFileBacked(ctx context.Context) error {
	backupDir, err := s.settings.GetBackupDir(ctx)
	if err != nil {
		return err
	}
	cleanDir := filepath.Clean(backupDir)
	if err := s.fs.MkdirAll(cleanDir, ContentDirPerm); err != nil {
		return core.NewErrorWithCause(core.CodeFileWriteError, "無法建立備份目錄，請確認路徑與權限。", err)
	}
	items, err := s.repo.ListBackups(ctx)
	if err != nil {
		return err
	}
	return s.ensureFiles(ctx, cleanDir, items)
}

func (s *Service) pruneBackups(ctx context.Context, items []Backup, keep int) (PruneResult, error) {
	result := PruneResult{Deleted: []Backup{}}
	unpinned := 0
	for _, item := range items {
		if item.Pinned {
			result.Kept++
			continue
		}
		if unpinned < keep {
			unpinned++
			result.Kept++
			continue
		}
		deleted, err := s.deleteAndHydrate(ctx, item)
		if err != nil {
			return PruneResult{}, err
		}
		result.Deleted = append(result.Deleted, deleted)
	}
	return result, nil
}

func (s *Service) deleteAndHydrate(ctx context.Context, item Backup) (Backup, error) {
	hydrated, err := HydrateContent(s.fs, item)
	if err != nil {
		return Backup{}, err
	}
	return hydrated, s.deleteBackup(ctx, item)
}

func (s *Service) deleteBackup(ctx context.Context, item Backup) error {
	if item.ContentPath == "" {
		return core.NewError(core.CodeFileReadError, "找不到備份檔。")
	}
	if err := s.fs.Remove(item.ContentPath); err != nil {
		return core.NewErrorWithCause(core.CodeFileWriteError, "無法刪除備份檔，請確認路徑與權限。", err)
	}
	return s.repo.DeleteBackup(ctx, item.ID)
}

func (s *Service) ensureFiles(ctx context.Context, backupDir string, items []Backup) error {
	for _, item := range items {
		if item.ContentPath != "" {
			if _, err := HydrateContent(s.fs, item); err != nil {
				return err
			}
			continue
		}
		path := ContentFilePath(backupDir, item.ID, item.Path)
		if err := s.fs.WriteFile(path, []byte(item.LegacyContent), ContentFilePerm); err != nil {
			return core.NewErrorWithCause(core.CodeFileWriteError, "無法寫入備份檔，請確認路徑與權限。", err)
		}
		if _, err := s.repo.UpdateBackupContentPath(ctx, item.ID, path); err != nil {
			return err
		}
	}
	return nil
}

func HydrateContent(fs filesystem.FileSystem, item Backup) (Backup, error) {
	if item.ContentPath == "" {
		return Backup{}, core.NewError(core.CodeFileReadError, "找不到備份檔。")
	}
	bytes, err := fs.ReadFile(item.ContentPath)
	if err != nil {
		return Backup{}, core.NewErrorWithCause(core.CodeFileReadError, "無法讀取備份檔，請確認路徑與權限。", err)
	}
	item.Content = string(bytes)
	masked := configmask.MaskContent(item.Format, item.Content)
	item.DisplayContent = masked.Content
	item.ContentMasked = masked.Masked
	item.LegacyContent = ""
	return item, nil
}

func ContentFilePath(backupDir string, id string, sourcePath string) string {
	ext := filepath.Ext(sourcePath)
	if strings.TrimSpace(ext) == "" {
		ext = defaultFileExt
	}
	return filepath.Join(filepath.Clean(backupDir), id+ext)
}

func exportFilename(item Backup) string {
	return item.ID + filepath.Ext(ContentFilePath("", item.ID, item.Path))
}

func hydrateBackups(fs filesystem.FileSystem, items []Backup) ([]Backup, error) {
	result := make([]Backup, 0, len(items))
	for _, item := range items {
		hydrated, err := HydrateContent(fs, item)
		if err != nil {
			return nil, err
		}
		result = append(result, hydrated)
	}
	return result, nil
}
