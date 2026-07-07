# mimiPaste P0+P1 Roadmap Spec

- Date: 2026-07-07
- Owner: User + Codex
- Status: Ready For Implementation
- Source Material: 2026-07-07 codebase health review; user request for P0+P1 executable spec; local code in `server/`, `web/src/`, `contracts/openapi.yaml`, `README.md`, `package.json`.

## Goal

Make mimiPaste safe enough for daily local use before adding more convenience features. The first goal is trust: applying or restoring a config must never silently leave the user guessing what changed, backups must be real recoverable artifacts, and secrets must not appear by default in normal browsing views.

After that, improve speed and usefulness for prompt work: variables, history, command palette access, safer imports, visible tag colors, and better scaling for larger prompt libraries.

## Non-Goals

- No cloud sync, multi-user accounts, authentication, hosted deployment, or remote sharing.
- No AI prompt generation or model-provider integration.
- No browser extension, desktop packaging, installer, or auto-update system.
- No silent compatibility bridge for old API behavior. The project is still `0.0.1`, so breaking local API shapes are allowed when the migration path is explicit.
- No fake backup success path. If backup files cannot be written, config apply/restore must fail visibly.
- No mock import/preview success states. Invalid JSON or failed parsing must surface as real errors.

## Assumptions

- The product is local-first and single-user.
- SQLite remains the metadata store.
- Backup content becomes file-backed under the configured backup directory. The database may keep legacy `content` only as migration input, not as the post-migration source of truth.
- P0 must finish before P1 work starts, except for harmless UI copy cleanup.
- Existing uncommitted work belongs to the user or a prior agent. Implementers must not revert unrelated changes.

## Current State

- Prompt CRUD, search, copy tracking, tags, import, and export exist. Relevant files: `server/internal/prompt/service.go`, `server/internal/storage/sqlite/prompt_repository.go`, `web/src/features/prompts/PromptWorkspace.tsx`.
- Config sources and profiles exist. Applying a profile reads the current file, creates a DB backup, writes the target file, then updates active profile. Relevant file: `server/internal/configfile/service.go`.
- Backup records are stored in SQLite in `config_backups.content`. The configured `backup_dir` is displayed and validated, but current backup writes do not use it. Relevant files: `server/internal/storage/sqlite/backup_repository.go`, `server/internal/storage/sqlite/settings_repository.go`, `server/internal/transport/http/settings_handlers.go`.
- Restore overwrites the config file from a backup record. It does not create a pre-restore backup.
- The config editor and backup viewer can show raw config content. Sensitive scalar fields are detected in `ReadResult.Fields`, but the main UI still uses raw content.
- `createAgent`, `createConfigSource`, config validation, config preview, and save-source mutations exist on the frontend, but the configuration workspace does not expose the full onboarding and preview flow.
- `contracts/openapi.yaml` documents many routes but several request and response schemas are missing or underspecified.
- Verification baseline on 2026-07-07: server tests, web lint, web typecheck, web tests, and web build pass. Vite build warns that the main JS chunk is larger than 500 kB.

## Target State

### P0: Safety And Reliability

- Backups are written as recoverable files in the configured backup directory.
- Backup metadata in SQLite records the file path, pinned state, source, profile, and timestamps.
- Retention is explicit: ordinary backups can be pruned; pinned backups are never pruned.
- Config apply and restore both require previewable diffs and create backups before writing.
- Apply/restore operations expose partial failures with an explicit operation status and backup ID.
- Config and backup content are masked by default where secrets may appear. Raw reveal is explicit, session-only, and never silently used for saving masked text.
- Users can add custom agents and config sources from the UI.
- OpenAPI describes all changed request/response bodies and problem responses.

### P1: Workflow And Scale

- Prompt variables allow templates such as `{{project}}` and collect values before copy.
- Prompt version history records meaningful edits, shows diffs, and supports rollback.
- A command palette lets users search prompts and copy quickly without navigating the full UI.
- Import shows a merge preview before writing: added, updated, skipped, and invalid items.
- Prompt tag colors appear consistently in prompt cards, tables, dialogs, and settings.
- Prompt list performance scales through query improvements, pagination or cursor loading, and route-level code splitting where documented support is verified.

## UX Writing And Interface Copy

- Locale: Traditional Chinese (Taiwan)
- Voice: concise, professional, human-centric
- Required reference: `C:/Users/qaz17/ai-skills/shared/write-executable-spec/references/ux-writing-zh-tw.md`
- Copy inventory:
  - Backup actions: `建立備份`, `釘選`, `取消釘選`, `匯出`, `刪除`, `清理備份`
  - Config apply/restore: `預覽差異`, `套用配置`, `還原備份`, `顯示完整內容`, `隱藏敏感內容`
  - Config source onboarding: `新增來源`, `工具`, `名稱`, `路徑`, `格式`, `驗證`
  - Prompt variables: `填入變數`, `複製`, `缺少必要欄位`
  - Import preview: `匯入預覽`, `新增`, `更新`, `略過`, `有錯誤`
  - Empty states: `尚無備份。請先套用配置。`, `尚未找到配置檔。請新增來源。`, `尚無歷史版本。`
- Copy to remove:
  - Descriptions that repeat a visible button, label, or layout.
  - Backend terms such as endpoint, migration, transaction, FTS, WAL, and mutation from user-facing UI.
  - Any phrase that tells users to click a visible button when the button text already says the action.
- Acceptance focus: every copy string must explain the user's decision or result, not the implementation.

## Required Skills

- `find-docs` or the repo-required `ctx7` CLI: verify current React, TanStack Query, TanStack Router, Vite/Rolldown, Base UI, and shadcn behavior before implementation touches those APIs.
- `shadcn`: use existing component conventions and avoid custom UI when an existing component fits.
- `direct-refactor`: use for file-backed backups and API contract changes. Do not add compatibility wrappers unless the spec names them as migration-only.
- `diagnosing-bugs`: use if any existing apply/restore/import behavior fails while implementing.
- `impeccable` or `shadcn-component-review`: use after frontend changes to check layout, spacing, copy, and component consistency.

## Documentation And External Research

| Topic | Why It Matters | Required Source/Skill | Status | Notes |
| --- | --- | --- | --- | --- |
| React 19 | Dialog state, local state, and error boundaries must match current behavior. | `ctx7` or `find-docs` | Verified | 2026-07-07: `ctx7` `/react/react/v19.2.7` docs checked for local state, conditional rendering, and controlled inputs before editing config/backup reveal and preview UI. |
| TanStack Query v5 | Mutations, invalidation, error retry, and optimistic updates affect apply/import flows. | `ctx7` or `find-docs` | Verified | 2026-07-07: `ctx7` `/tanstack/query/v5.90.3` docs confirm `useMutation` with `onSuccess` and `queryClient.invalidateQueries({ queryKey })`; returning a Promise keeps mutation pending until invalidation work completes. |
| TanStack Router | Command palette and route code splitting may depend on router API details. | `ctx7` or `find-docs` | Verified | 2026-07-07: `ctx7` docs checked for `lazyRouteComponent`; route modules now lazy-load feature workspaces. |
| Base UI / shadcn | Existing components use Base UI primitives and shadcn conventions. | `ctx7`, `find-docs`, `shadcn` | Verified | 2026-07-07: `shadcn info -c web --json` confirmed Vite, base-nova, Base UI, lucide, installed form/select/card/empty components. `shadcn docs button card select input field empty` and `ctx7` `/mui/base-ui/v1.6.0`, `/shadcn-ui/ui` docs checked before source onboarding UI. |
| Vite 8 / Rolldown | Build warning points to large bundle and code-splitting options. | `ctx7` or `find-docs` | Verified | 2026-07-07: current Vite/Rolldown docs checked for chunk warning and output splitting; route-level splitting resolved the warning without raising the limit. |
| SQLite FTS5 and migrations | Prompt search, history, and migration shape affect data safety. | Official SQLite docs or `find-docs` | Verified | 2026-07-07: SQLite migration, transaction, and foreign-key behavior checked before prompt version history schema changes. No FTS schema change was needed. |

## Destructive Refactor Contract

- Removed or replaced behavior:
  - DB-only backup content is replaced by file-backed backup content.
  - Apply/restore API responses may change from plain config read result to operation-aware results.
  - Import may change from direct write to preview-then-confirm.
- Compatibility intentionally not preserved:
  - Old local clients that assume missing request schemas or direct import writes do not need compatibility.
  - UI does not need to preserve immediate raw secret display.
- Data/schema/config migration:
  - Add backup metadata fields: `content_path`, `pinned`, and retention-relevant timestamps.
  - Add apply/restore operation tracking table or equivalent persistent status model.
  - Add prompt version history tables before P1 history work.
  - Add import preview result structures before changing import confirmation.
  - Existing DB backup rows must be migrated to files before the app reports them usable.
- User/operator impact:
  - Users may see an explicit migration failure if existing backups cannot be written to `backup_dir`.
  - Users must explicitly reveal raw config content before editing secrets.
  - Restores create an additional backup and may increase disk usage.
- Rollback or restore path:
  - Existing DB file remains the rollback unit.
  - Before migration, tests must prove old `config_backups.content` rows can be exported into files.
  - Pinned backups survive retention cleanup.
- Failure exposure strategy:
  - No silent fallback to DB content after file-backed migration.
  - If backup write fails, apply/restore fails before changing config files.
  - If config file write succeeds but active profile update fails, the API returns an explicit partial-failure problem with request ID, backup ID, and operation ID.

## Requirements

1. P0 backup writes must create a backup file in the configured backup directory before any config file is overwritten.
2. P0 backup metadata must store the backup file path, source ID, source path, source name, profile ID when present, creation time, and pinned state.
3. P0 backup restore must create a pre-restore backup before writing restored content.
4. P0 backup retention must support a configurable keep count and must never delete pinned backups.
5. P0 backup UI must allow preview, restore, pin/unpin, export, and delete.
6. P0 config apply must require a previewable diff in the UI before the write action is enabled.
7. P0 config apply/restore must record operation status and expose partial failures explicitly.
8. P0 config source onboarding must let users add a built-in or custom agent, absolute file path, format, and display name.
9. P0 config source onboarding must validate path, readability, and supported format before saving.
10. P0 config and backup content must be masked by default when sensitive keys are detected.
11. P0 raw reveal must be explicit, session-only, and visually reversible.
12. P0 saving masked content must be blocked with a user-visible error.
13. P0 OpenAPI must include request and response schemas for all changed endpoints.
14. P0 frontend and backend types must be aligned with the OpenAPI contract.
15. P0 tests must cover backup file creation, migration, retention, apply partial failure, restore pre-backup, source creation, and secret masking.
16. P1 prompt variables must detect `{{name}}` tokens and prompt the user for values before copy.
17. P1 prompt variables must never record variable-filled content as a permanent prompt edit unless the user explicitly saves it.
18. P1 prompt history must record create/update/delete-relevant content changes and support diff and rollback.
19. P1 command palette must support searching prompts and copying a selected prompt from the keyboard.
20. P1 import preview must validate the entire file before writing any prompt data.
21. P1 import preview must show added, updated, skipped, and invalid counts.
22. P1 prompt tags must render their configured colors anywhere tags appear.
23. P1 prompt list must avoid per-row tag queries for large lists.
24. P1 build must reduce or intentionally justify the large main JS chunk after current Vite docs are checked.
25. UI copy must follow Traditional Chinese (Taiwan) rules and keep empty states short and actionable.

## Implementation Plan

### P0 Area 1: Backup Storage And Retention

- Change:
  - Add file-backed backup content under configured `backup_dir`.
  - Add metadata fields for file path and pinned state.
  - Add retention settings with explicit prune action.
  - Add migration/backfill for existing DB-only backup rows.
- Files likely affected:
  - `data/migrations/*.sql`
  - `server/internal/backup/*`
  - `server/internal/configfile/service.go`
  - `server/internal/storage/sqlite/backup_repository.go`
  - `server/internal/storage/sqlite/settings_repository.go`
  - `server/internal/platform/filesystem/filesystem.go`
  - `web/src/features/backups/*`
  - `web/src/features/settings/*`
- Edge cases:
  - Backup directory missing, not writable, or on a different drive.
  - Existing DB backups cannot be migrated.
  - Backup file missing after metadata exists.
  - Pinned backup selected during prune.
- Validation:
  - Server tests create real backup files in temp directories.
  - Tests prove prune deletes only unpinned backups.
  - UI tests cover pin/export/delete states.

### P0 Area 2: Apply And Restore Operation Safety

- Change:
  - Add operation status for apply/restore.
  - Make apply UI preview diff before enablement.
  - Make restore create a pre-restore backup.
  - Return explicit partial failure details when a file write and metadata update disagree.
- Files likely affected:
  - `server/internal/configfile/service.go`
  - `server/internal/configfile/model.go`
  - `server/internal/transport/http/config_handlers.go`
  - `server/internal/transport/http/backup_handlers.go`
  - `server/internal/core/errors.go`
  - `server/internal/transport/http/problem_catalog.go`
  - `web/src/features/agents/AgentsWorkspace.tsx`
  - `web/src/features/backups/BackupsWorkspace.tsx`
- Edge cases:
  - Diff has no changes.
  - Profile format does not match source format.
  - File write succeeds but active profile update fails.
  - Restore target source no longer exists.
- Validation:
  - Backend tests simulate filesystem and DB failures.
  - Frontend tests confirm apply is disabled until preview succeeds.

### P0 Area 3: Secret Masking And Reveal

- Change:
  - Generate masked config and backup content for display.
  - Require explicit reveal before raw content is shown.
  - Block save when the current content buffer is masked.
- Files likely affected:
  - `server/internal/configfile/service.go`
  - `server/internal/configfile/model.go`
  - `web/src/features/agents/AgentsWorkspace.tsx`
  - `web/src/features/backups/BackupsWorkspace.tsx`
  - `web/src/lib/errors/*`
- Edge cases:
  - TOML/JSON parse failure.
  - Sensitive key nested inside an object.
  - Key names such as `api_key`, `token`, `secret`, `password`, `authorization`, and `credential`.
  - User tries to save after viewing masked text.
- Validation:
  - Unit tests cover redaction without leaking values.
  - UI tests cover reveal/hide and blocked masked save.

### P0 Area 4: Config Source Onboarding

- Change:
  - Add UI path for creating agents and config sources.
  - Validate path and content before saving.
  - Show actionable empty state when no config sources exist.
- Files likely affected:
  - `web/src/features/agents/AgentsWorkspace.tsx`
  - `web/src/features/agents/agent-api.ts`
  - `web/src/features/agents/agent-queries.ts`
  - `server/internal/agent/service.go`
  - `server/internal/transport/http/agent_handlers.go`
- Edge cases:
  - Duplicate path.
  - Unsupported format.
  - Path is relative.
  - File exists but cannot be read.
- Validation:
  - Server tests for duplicate and invalid sources.
  - UI tests for no-source empty state and source creation modal.

### P0 Area 5: API Contract

- Change:
  - Complete OpenAPI schemas for all request and response bodies.
  - Add schemas for operation status, backup metadata, import preview, masked content, and Problem Details.
  - Align frontend types with contract names and response shapes.
- Files likely affected:
  - `contracts/openapi.yaml`
  - `web/src/features/*/*-types.ts`
  - `README.md`
- Edge cases:
  - Error responses include request ID.
  - 204 responses do not require JSON body.
- Validation:
  - Manual OpenAPI review plus typecheck.
  - Tests assert key response shapes where code currently parses them.

### P1 Area 6: Prompt Variables

- Change:
  - Detect `{{variable}}` tokens in prompt content.
  - Before copy, show a dialog with one input per unique variable.
  - Copy rendered content and record normal copy usage.
- Files likely affected:
  - `web/src/features/prompts/PromptWorkspace.tsx`
  - `web/src/features/prompts/PromptEditorDialog.tsx`
  - `web/src/features/prompts/prompt-state.ts`
  - `server/internal/prompt/model.go` only if persisted variable metadata is needed.
- Edge cases:
  - Duplicate variables.
  - Empty variable value.
  - Escaped braces or malformed tokens.
- Validation:
  - Unit tests for token parsing and rendering.
  - UI tests for variable copy flow.

### P1 Area 7: Prompt History And Rollback

- Change:
  - Add prompt version records for meaningful edits.
  - Add diff and rollback API/UI.
  - Preserve copy count independently of content versions.
- Files likely affected:
  - `data/migrations/*.sql`
  - `server/internal/prompt/*`
  - `server/internal/storage/sqlite/prompt_repository.go`
  - `server/internal/transport/http/prompt_handlers.go`
  - `web/src/features/prompts/*`
- Edge cases:
  - Rollback to deleted tag names.
  - Import overwrites prompt content.
  - Empty version history.
- Validation:
  - Backend tests for history creation and rollback.
  - UI tests for history empty state and rollback confirmation.

### P1 Area 8: Command Palette

- Change:
  - Add keyboard-openable command palette for prompt search and copy.
  - Keep copy behavior identical to prompt browser copy, including variables.
- Files likely affected:
  - `web/src/app/shell.tsx`
  - `web/src/features/prompts/*`
  - `web/src/components/ui/*` if a command component is added.
- Edge cases:
  - No prompts.
  - Active dialog open.
  - Variable prompt selected from palette.
- Validation:
  - UI tests for opening palette, filtering, and copying.

### P1 Area 9: Import Preview

- Change:
  - Split import into preview and confirm.
  - Validate the whole payload before writing.
  - Show counts and item-level errors.
- Files likely affected:
  - `server/internal/prompt/service.go`
  - `server/internal/storage/sqlite/prompt_repository.go`
  - `server/internal/transport/http/prompt_handlers.go`
  - `web/src/features/prompts/PromptWorkspace.tsx`
- Edge cases:
  - Duplicate IDs inside the file.
  - Duplicate title with different ID.
  - Invalid JSON.
  - Very large import file.
- Validation:
  - Backend tests assert no writes happen after invalid preview.
  - UI tests confirm invalid JSON surfaces a clear error.

### P1 Area 10: Visual Polish And Performance

- Change:
  - Render tag colors consistently.
  - Remove N+1 prompt tag loading.
  - Add pagination or cursor loading if prompt list grows.
  - Apply route-level code splitting only after current docs confirm the supported setup.
- Files likely affected:
  - `server/internal/storage/sqlite/prompt_repository.go`
  - `web/src/features/prompts/PromptBrowser.tsx`
  - `web/src/features/prompts/PromptEditorDialog.tsx`
  - `web/src/features/settings/TagSettingsPanel.tsx`
  - `web/src/app/router.tsx`
- Edge cases:
  - Missing or invalid tag color.
  - Hundreds or thousands of prompts.
  - Build output still exceeds warning threshold.
- Validation:
  - Unit tests for color normalization.
  - Server tests or benchmarks for list query count.
  - `pnpm build:web` no longer warns, or the spec is updated with a documented reason.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-1 | Applying a config writes a backup file under `backup_dir` before the target config file changes. | Go test using temp directory and fake config source. |
| AC-2 | If backup file creation fails, apply/restore returns a Problem Details error and does not modify the target config file. | Go test with failing filesystem. |
| AC-3 | Restore creates a pre-restore backup before overwriting current config. | Go test checks backup count and file content. |
| AC-4 | Pinned backups are not deleted by retention cleanup. | Go test for prune behavior. |
| AC-5 | Backup UI supports preview, restore, pin/unpin, export, and delete. | React tests plus manual browser check. |
| AC-6 | Apply UI requires a successful diff preview before enabling final apply. | React test. |
| AC-7 | Partial apply failure returns operation ID, backup ID, request ID, and retry/restore guidance. | Go HTTP test. |
| AC-8 | Config source empty state offers `新增來源` and source creation validates path and format. | React test and Go handler tests. |
| AC-9 | Sensitive config and backup values are hidden by default. | Go redaction tests and React render test. |
| AC-10 | Raw content reveal is explicit and can be hidden again in the same session. | React test. |
| AC-11 | Saving masked content is blocked with a visible error. | React test. |
| AC-12 | OpenAPI includes schemas for every P0 changed request and response body. | Review `contracts/openapi.yaml`; `pnpm typecheck:web` passes. |
| AC-13 | Existing DB-only backups are migrated to files or startup fails with an explicit error. | Go migration/backfill test. |
| AC-14 | Prompt variables parse unique `{{name}}` tokens and copy rendered content. | Unit and React tests. |
| AC-15 | Prompt variable copy does not modify the saved prompt. | React test and API assertion. |
| AC-16 | Prompt history records edits and rollback restores the selected version. | Go tests plus React test. |
| AC-17 | Command palette searches prompts and copies from keyboard. | React test. |
| AC-18 | Import preview writes no data until the user confirms. | Go service test. |
| AC-19 | Invalid import JSON or invalid prompt item shows a clear error and writes nothing. | React test and Go test. |
| AC-20 | Tag colors appear in prompt cards, list rows, dialogs, and settings. | React tests or Playwright screenshot check. |
| AC-21 | Prompt listing avoids one tag query per prompt. | Go repository test or benchmark with query instrumentation. |
| AC-22 | Web build warning for main chunk is resolved or documented after current Vite docs are verified. | `pnpm build:web` output. |
| AC-23 | UI copy uses Traditional Chinese (Taiwan), avoids backend jargon, and keeps empty states under 20 Chinese words where practical. | Copy review against UX writing reference. |
| AC-24 | All new failure paths surface as explicit errors, logs, failing tests, or blocked checklist items. | Test suite and manual error-path review. |

## Verification Commands

```powershell
go -C server test ./... -timeout=60s
.\scripts\pnpm.cmd --dir web lint
.\scripts\pnpm.cmd --dir web typecheck
.\scripts\pnpm.cmd --dir web test
.\scripts\pnpm.cmd --dir web build
.\scripts\pnpm.cmd check
```

## Risks And Blockers

- Current external docs were verified for React, TanStack Query, TanStack Router, Base UI/shadcn, Vite/Rolldown, and SQLite migration behavior before the related changes landed.
- File-backed backup migration is the riskiest P0 change. If migration cannot safely preserve existing DB backups, implementation must stop and record the blocker instead of adding a fallback read path.
- Atomic file write behavior must be designed carefully on Windows. If current Go/file-system docs or local tests show rename semantics are unsafe for the target path, implementation must expose the limitation and require a decision.
- Prompt history can grow storage quickly. Retention or compaction policy is out of P0 but must be considered before P1 acceptance.
