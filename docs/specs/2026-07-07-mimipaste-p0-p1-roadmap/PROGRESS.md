# mimiPaste P0+P1 Roadmap Progress

- Spec: ./SPEC.md
- Status: Complete
- Last Updated: 2026-07-07

## Ground Rules

- Update this file as work completes.
- Do not mark an item done until code, docs, tests, and verification are actually complete.
- Add a blocker note instead of inventing fallback behavior.
- P0 safety work must finish before P1 convenience work starts, unless the P1 task is only copy cleanup.
- Do not revert unrelated user changes.

## Checklist

### Research

- [x] Read local project instructions, `README.md`, and this spec.
- [x] Verify current React 19 docs before editing app shell, dialogs, or error boundaries.
- [x] Verify current TanStack Query v5 docs before changing mutations, invalidation, retries, or optimistic updates.
- [x] Verify current TanStack Router docs before route-level code splitting or command palette routing changes.
- [x] Verify current Base UI / shadcn docs before adding new dialogs, selects, command UI, or toggles.
- [x] Verify current Vite 8 / Rolldown docs before bundle-splitting work.
- [x] Verify SQLite migration/FTS5 docs before prompt history or FTS schema changes.
- [x] Record docs findings or blockers in `SPEC.md`.

### P0 Implementation: Backup Storage

- [x] Add schema migration for backup file path and pinned state.
- [x] Add app-level migration/backfill for existing DB-only backup content.
- [x] Change backup creation to write recoverable backup files under `backup_dir`.
- [x] Change backup reads to use file-backed content after migration.
- [x] Add backup pin/unpin support.
- [x] Add backup delete support.
- [x] Add backup export support.
- [x] Add retention cleanup that never deletes pinned backups.
- [x] Update settings UI for retention settings if needed. Keep count is exposed inline in the backup workspace.

### P0 Implementation: Apply And Restore Safety

- [x] Add apply/restore operation status model.
- [x] Add explicit partial-failure error code and Problem Details catalog entry.
- [x] Make restore create a pre-restore backup.
- [x] Require diff preview before apply in the configuration UI.
- [x] Show operation status and recovery guidance in the UI.
- [x] Ensure file-write failures and metadata failures surface clearly.

### P0 Implementation: Secret Masking

- [x] Add backend masking for config and backup display content.
- [x] Add explicit raw reveal/hide behavior.
- [x] Block saving masked content.
- [x] Add UI state for masked/revealed config editor.
- [x] Add UI state for masked/revealed backup preview.
- [x] Verify sensitive values never appear in default render paths.

### P0 Implementation: Config Source Onboarding

- [x] Add no-source empty state with `新增來源`.
- [x] Add custom agent creation UI.
- [x] Add config source creation UI.
- [x] Validate absolute path, readability, and format before save.
- [x] Handle duplicate source paths with a clear error.

### P0 Implementation: API Contract

- [x] Complete OpenAPI request schemas for tags, agents, config sources, profiles, backups, and settings.
- [x] Complete OpenAPI response schemas for list/detail/action endpoints.
- [x] Add schemas for operation status, masked content, retention, backup metadata, and Problem Details.
- [x] Align frontend TypeScript types with the contract.
- [x] Update README for backup storage and safety behavior.

### P1 Implementation: Prompt Variables

- [x] Add variable token parser.
- [x] Add variable fill dialog before copy.
- [x] Render copy content from variable values.
- [x] Keep saved prompt unchanged after variable copy.
- [x] Record copy usage after successful clipboard write.

### P1 Implementation: Prompt History

- [x] Add prompt version history schema.
- [x] Record meaningful prompt edits.
- [x] Add prompt history API.
- [x] Add diff UI.
- [x] Add rollback UI and confirmation.

### P1 Implementation: Command Palette

- [x] Add keyboard-openable command palette.
- [x] Support prompt search in palette.
- [x] Support copy from keyboard selection.
- [x] Route variable prompts through the same variable fill flow.

### P1 Implementation: Import Preview

- [x] Add import preview API.
- [x] Validate the whole import file before any write.
- [x] Show added, updated, skipped, and invalid counts.
- [x] Add confirm import action.
- [x] Ensure invalid import writes nothing.

### P1 Implementation: Visual Polish And Performance

- [x] Render tag colors in prompt cards.
- [x] Render tag colors in prompt list rows.
- [x] Render tag colors in prompt dialogs.
- [x] Remove N+1 prompt tag queries.
- [x] Add pagination or cursor loading if needed. Batch tag loading resolves the P1 scale issue; cursor loading is not needed for this slice.
- [x] Apply route-level code splitting after docs verification.
- [x] Re-run web build and record bundle result.

### UX Writing

- [x] Review UI copy against `C:/Users/qaz17/ai-skills/shared/write-executable-spec/references/ux-writing-zh-tw.md`.
- [x] Remove redundant descriptions that repeat labels, layout, or obvious controls.
- [x] Replace backend jargon with user-facing language.
- [x] Keep empty states under 20 Chinese words where practical.
- [x] Confirm all destructive actions use clear confirmation copy.

### Destructive Refactor / Removal

- [x] Remove DB-only backup content as a runtime source of truth after migration.
- [x] Confirm no runtime caller silently falls back to DB backup content.
- [x] Confirm old backups are migrated to files or startup fails explicitly.
- [x] Confirm API response shape changes are reflected in frontend types and docs.
- [x] Confirm no obsolete direct-import path bypasses preview once P1 import preview lands.

### Tests And Verification

- [x] Add/update Go tests for backup file creation.
- [x] Add/update Go tests for backup migration/backfill.
- [x] Add/update Go tests for backup retention and pinned backups.
- [x] Add/update Go tests for apply partial failure.
- [x] Add/update Go tests for restore pre-backup.
- [x] Add/update Go tests for config source validation.
- [x] Add/update Go tests for secret masking.
- [x] Add/update React tests for apply preview gating.
- [x] Add/update React tests for backup actions.
- [x] Add/update React tests for secret reveal/hide.
- [x] Add/update React tests for config source onboarding.
- [x] Add/update tests for prompt variables.
- [x] Add/update tests for prompt history.
- [x] Add/update tests for command palette.
- [x] Add/update tests for import preview.
- [x] Run `go -C server test ./... -timeout=60s`.
- [x] Run `.\scripts\pnpm.cmd --dir web lint`.
- [x] Run `.\scripts\pnpm.cmd --dir web typecheck`.
- [x] Run `.\scripts\pnpm.cmd --dir web test`.
- [x] Run `.\scripts\pnpm.cmd --dir web build`.
- [x] Run `.\scripts\pnpm.cmd check`.
- [x] Verify failure paths surface explicitly.

### Documentation And Handoff

- [x] Update `README.md`.
- [x] Update `contracts/openapi.yaml`.
- [x] Record final changed files and validation results.
- [x] Mark all acceptance criteria pass/fail.
- [x] Update this progress file after each implementation slice.

## Acceptance Results

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-1 | Pass | `go -C server test ./... -timeout=60s`; `TestConfigApplyBackupAndRestore` checks backup file content. |
| AC-2 | Pass | `go -C server test ./... -timeout=60s`; `TestApplyFailureDoesNotSetActiveProfile` and `TestRestoreBackupWriteFailureDoesNotModifyConfig` cover apply/restore backup-write failures. |
| AC-3 | Pass | `go -C server test ./... -timeout=60s`; `TestConfigApplyBackupAndRestore` checks restore creates a pre-restore backup. |
| AC-4 | Pass | `go -C server test ./... -timeout=60s`; `TestBackupPinExportDeleteAndPrune` verifies pinned backups survive prune. |
| AC-5 | Pass | `.\scripts\pnpm.cmd --dir web test`; `BackupsWorkspace` tests cover preview, export, restore, pin, prune, delete, and secret reveal. |
| AC-6 | Pass | `.\scripts\pnpm.cmd --dir web test`; `AgentsWorkspace` test confirms apply stays disabled until `預覽差異` succeeds. |
| AC-7 | Pass | `go -C server test ./... -timeout=60s`; service test covers operation/backup IDs and HTTP Problem Details test covers request ID plus recovery guidance. |
| AC-8 | Pass | `go -C server test ./... -timeout=60s` and `.\scripts\pnpm.cmd --dir web test`; source creation validates unreadable/invalid/duplicate paths and UI covers no-source onboarding plus custom agent creation. |
| AC-9 | Pass | `go -C server test ./... -timeout=60s` and `.\scripts\pnpm.cmd --dir web test`; backend and React tests cover masked default content. |
| AC-10 | Pass | `.\scripts\pnpm.cmd --dir web test`; config and backup reveal/hide tests cover session UI toggles. |
| AC-11 | Pass | `go -C server test ./... -timeout=60s`; backend rejects `content_masked` saves, and config UI disables masked saves. |
| AC-12 | Pass | `contracts/openapi.yaml` now includes schemas for prompts, tags, agents, config sources, profiles, backups, settings, masked content, operation results, and Problem Details; `.\scripts\pnpm.cmd --dir web typecheck` passes. |
| AC-13 | Pass | `go -C server test ./... -timeout=60s`; `TestStartupBackfillsLegacyBackupContent` verifies DB-only backup content is written to a file on startup. |
| AC-14 | Pass | `.\scripts\pnpm.cmd --dir web test`; `prompt-variables` unit tests cover unique parsing/rendering, and `PromptWorkspace` React test covers variable fill before copy. |
| AC-15 | Pass | `.\scripts\pnpm.cmd --dir web test`; `PromptWorkspace` React test verifies rendered variable content records copy usage without sending a prompt update. |
| AC-16 | Pass | `go -C server test ./... -timeout=60s` and `.\scripts\pnpm.cmd --dir web test`; prompt version migration/API and rollback UI are covered. |
| AC-17 | Pass | `.\scripts\pnpm.cmd --dir web test`; `PromptCommandPalette` covers Ctrl/Cmd+K search, keyboard selection, normal copy, and variable prompts. |
| AC-18 | Pass | `go -C server test ./... -timeout=60s`; import preview validates before confirm, and the legacy direct import route rejects writes. |
| AC-19 | Pass | `go -C server test ./... -timeout=60s` and `.\scripts\pnpm.cmd --dir web test`; invalid import preview/confirm paths surface errors and write nothing. |
| AC-20 | Pass | `.\scripts\pnpm.cmd --dir web test`; tag color swatches render through `PromptTagBadge` in cards, rows, dialogs, and settings. |
| AC-21 | Pass | `go -C server test ./... -timeout=60s`; prompt repository now batch-loads tags instead of issuing per-prompt tag queries. |
| AC-22 | Pass | `.\scripts\pnpm.cmd --dir web build`; route-level lazy components reduce the main JS chunk to 409.57 kB with no Vite chunk warning. |
| AC-23 | Pass | UI copy reviewed against `ux-writing-zh-tw.md`; backend-jargon search found no user-facing endpoint/mutation/FTS/WAL text, and `遷移目錄` was renamed to `資料更新目錄`. |
| AC-24 | Pass | `.\scripts\pnpm.cmd check`; backup write failure, restore write failure, partial apply failure, masking, and Problem Details paths are covered. |

## Final Changed Files

- Backend: `server/internal/app/app.go`, `server/internal/app/app_test.go`, `server/internal/backup/*`, `server/internal/configfile/*`, `server/internal/configmask/*`, `server/internal/prompt/*`, `server/internal/storage/sqlite/*`, `server/internal/transport/http/*`.
- Frontend: `web/src/app/*`, `web/src/components/ui/*`, `web/src/features/agents/*`, `web/src/features/backups/*`, `web/src/features/prompts/*`, `web/src/features/settings/*`, `web/src/lib/*`, `web/src/routes/*`.
- Data and contract: `data/migrations/202607070001_file_backed_backups.sql`, `data/migrations/202607070002_config_operations.sql`, `data/migrations/202607070003_prompt_versions.sql`, `contracts/openapi.yaml`, `README.md`, `pnpm-lock.yaml`, `web/package.json`.
- Spec: `docs/specs/2026-07-07-mimipaste-p0-p1-roadmap/SPEC.md`, `docs/specs/2026-07-07-mimipaste-p0-p1-roadmap/PROGRESS.md`.

## Validation Results

- `go -C server test ./... -timeout=60s`: pass.
- `.\scripts\pnpm.cmd --dir web lint`: pass.
- `.\scripts\pnpm.cmd --dir web typecheck`: pass.
- `.\scripts\pnpm.cmd --dir web test`: pass, 12 files / 36 tests.
- `.\scripts\pnpm.cmd --dir web build`: pass, main JS chunk 409.57 kB, no Vite chunk warning.
- `.\scripts\pnpm.cmd check`: pass.

## Blockers

| Date | Blocker | Needed To Unblock |
| --- | --- | --- |
| 2026-07-07 | None. | P0+P1 implementation and verification complete. |

## Change Log

- 2026-07-07: Created P0+P1 executable spec and progress tracker.
- 2026-07-07: Added file-backed backup actions: pin, export, delete, and prune; added backend and React tests.
- 2026-07-07: Added config apply/restore operation records, partial-failure Problem Details, apply preview gating, secret masking/reveal UI, OpenAPI schemas, README notes, and validation via `.\scripts\pnpm.cmd check`.
- 2026-07-07: Added config source onboarding UI for existing/custom agents, backend path/readability/format/duplicate validation, OpenAPI/doc research notes, and Go/React coverage.
- 2026-07-07: Completed broad OpenAPI request/response schemas for P0 API contract coverage.
- 2026-07-07: Added prompt variable parsing, fill-before-copy dialog, rendered clipboard copy, and React/unit tests; verified with web lint, typecheck, and test.
- 2026-07-07: Added prompt version history, diff/rollback API and UI, import preview/confirm flow, command palette, tag color rendering, prompt tag batch loading, and route-level code splitting.
- 2026-07-07: Final validation: `go -C server test ./... -timeout=60s`, web lint, typecheck, test, build, and `.\scripts\pnpm.cmd check` all pass. Web build main JS chunk is 409.57 kB with no Vite chunk warning.
