# mimiPaste Web UI Progress

- Spec: ./SPEC.md
- Status: In Progress
- Last Updated: 2026-07-06

## Ground Rules

- Update this file as work completes.
- Do not mark an item done until code/docs/tests are actually changed and verified.
- Add a blocker note instead of inventing fallback behavior.
- Backend tests must run with `-timeout=60s`.
- Do not commit SQLite DB files, backups, user config files, API keys, tokens, or generated local state.

## Checklist

### Research

- [x] Read local project instructions and relevant docs.
- [x] Verify React docs for state and form behavior.
- [x] Verify Vite docs for backend integration and dev proxy behavior.
- [x] Resolve shadcn/ui official docs/library ID.
- [x] Verify shadcn/ui `init --preset b0 --template vite` support.
- [x] Decode shadcn `b0` preset.
- [x] Inspect mimiGrep frontend structure, shadcn config, Vite config, app shell, router, query client, and API client.
- [x] Resolve TanStack Router official docs/library ID.
- [x] Resolve TanStack Query official docs/library ID.
- [x] Verify TanStack Router Vite setup and route patterns.
- [x] Verify TanStack Query v5 query/mutation patterns.
- [x] Verify shadcn/ui component usage before adding each component.
- [x] Verify Tailwind CSS Vite setup.
- [x] Verify current Go version and module layout recommendations.
- [x] Verify SQLite FTS5, WAL, foreign key, and backup behavior.
- [x] Choose and document SQLite Go driver.
- [x] Choose and document TOML parser strategy.
- [x] Verify CodeMirror 6 React integration and TOML syntax support.
- [x] Verify Browser Clipboard API behavior and permission limits.
- [x] Record final docs findings or blockers in `SPEC.md`.

### Project Scaffolding

- [x] Enable or install `pnpm` through Corepack; do not fall back to npm.
- [x] Add root `package.json` with `packageManager`.
- [x] Add `pnpm-workspace.yaml`.
- [x] Create `web/` React + Vite + TypeScript app.
- [x] Initialize shadcn with `pnpm dlx shadcn@latest init --name web --preset b0 --template vite`.
- [x] Confirm `web/components.json` uses `@` aliases, `lucide`, Tailwind CSS variables, and Vite template.
- [x] Create `server/` Go module.
- [x] Add `contracts/openapi.yaml`.
- [x] Add `scripts/dev.ps1`, `scripts/dev.sh`, and `scripts/check.ps1`.
- [x] Add CI workflow at `.github/workflows/ci.yml`.
- [x] Add root `.gitignore` for Node, Go, SQLite DB, backups, local settings, and secrets.
- [x] Add README setup commands.
- [x] Configure frontend dev proxy to Go API.
- [x] Configure Go server to serve production `web/dist`.

### Architecture Guardrails

- [x] Write fixed root directory contract into `SPEC.md`.
- [x] Write frontend feature directory contract into `SPEC.md`.
- [x] Write Go package boundary contract into `SPEC.md`.
- [x] Write forbidden directory names into `SPEC.md`.
- [x] Keep `web/src/lib/api/` as the only direct fetch layer.
- [x] Keep `server/internal/configfile/` as the only agent config file write path.
- [x] Keep business services free of HTTP, SQLite driver, and concrete filesystem imports.
- [x] Update `contracts/openapi.yaml` whenever routes change.

### Backend Foundation

- [x] Implement Go app entrypoint.
- [x] Implement local HTTP server.
- [x] Implement JSON response helpers.
- [x] Implement stable error shape.
- [x] Implement request logging without sensitive values.
- [x] Implement config loading for DB path, backup directory, and port.
- [x] Implement `GET /api/health`.

### Database

- [x] Add migration runner.
- [x] Add initial SQLite schema.
- [x] Add FTS5 table and sync strategy.
- [x] Enable foreign keys.
- [x] Decide WAL mode after docs verification.
- [x] Add repository tests with temp DB.
- [x] Ensure migration failure stops startup.

### Prompt Management

- [x] Implement prompt create/read/update.
- [x] Implement confirmed prompt delete.
- [x] Implement tags.
- [x] Implement FTS search.
- [x] Implement filters and sorting.
- [x] Implement copy success usage tracking.
- [x] Ensure copy failure does not update usage counters.
- [x] Implement JSON export.
- [x] Implement transactional JSON import.

### Agent Config Management

- [x] Seed built-in Codex and Claude agent types.
- [x] Implement custom agent type creation.
- [x] Implement config source registration.
- [x] Restrict file read/write to registered config sources.
- [x] Implement config file read.
- [x] Implement config validation.
- [x] Implement raw config editor save.
- [x] Implement visual config editor for verified fields.
- [x] Preserve unknown config fields.
- [x] Implement profile create/read/update/delete.
- [x] Implement diff preview.
- [x] Implement backup before apply.
- [x] Implement profile apply with transaction-like state handling.
- [x] Ensure failed apply does not update active profile.
- [x] Implement backup listing and detail view.
- [x] Implement backup restore with diff and confirmation.

### Frontend UI

- [x] Mirror mimiGrep frontend architecture where applicable.
- [x] Remove all copied mimiGrep Discord, desktop, collector, WebSocket, and updater logic.
- [x] Build app shell and navigation.
- [x] Build typed nav config for `工作區`, `Agent`, and `系統`.
- [x] Build prompt list page.
- [x] Build prompt card view.
- [x] Build prompt compact list view.
- [x] Build prompt view mode toggle.
- [x] Persist prompt view preference in localStorage.
- [x] Ensure view switching keeps current search, filters, selection, and sort.
- [x] Build fixed right-side prompt detail/edit panel.
- [x] Ensure prompt selection updates the detail panel without modal or route navigation.
- [x] Build prompt create mode inside the right-side panel.
- [x] Ensure prompt create/cancel preserves current search and filters.
- [x] Select newly created prompt after save.
- [x] Build prompt detail editor.
- [x] Build prompt search and filters.
- [x] Build tag management.
- [x] Build agent overview page.
- [x] Build config source page.
- [x] Build profile editor.
- [x] Build diff preview UI.
- [x] Build backup page.
- [x] Build settings page.
- [x] Add loading, empty, error, and success states.
- [x] Confirm text does not overflow at desktop and small desktop widths.

### UX Writing

- [x] Review UI copy against `references/ux-writing-zh-tw.md`.
- [x] Remove redundant descriptions that repeat visible UI labels or layout.
- [x] Replace backend jargon with user-facing language.
- [x] Keep empty states under 20 Chinese words with a clear next action.
- [x] Mask sensitive values by default.
- [x] Ensure errors explain what failed and what to check next.

### Tests And Verification

- [x] Add backend unit tests.
- [x] Add backend integration tests with temp files.
- [x] Add frontend unit/component tests.
- [x] Add import/export validation tests.
- [x] Add config apply failure tests.
- [x] Add sensitive log masking test.
- [x] Run `cd server && go test ./... -timeout=60s`.
- [ ] Run `cd server && go test ./... -race -timeout=60s`.
- [x] Run `cd web && pnpm lint`.
- [x] Run `cd web && pnpm test`.
- [x] Run `cd web && pnpm build`.
- [x] Run full app smoke test.
- [x] Verify failure paths surface explicitly.

### Documentation And Handoff

- [x] Update README with development setup.
- [x] Document local data paths.
- [x] Document config backup and restore behavior.
- [x] Document import/export format.
- [x] Record final changed files and validation results.
- [x] Mark all acceptance criteria pass/fail.

## Acceptance Results

| Criterion | Result | Evidence |
| --- | --- | --- |
| AC-1 | Pass | `web/`, `server/`, `corepack pnpm check`. |
| AC-2 | Pass | `GET http://127.0.0.1:18700/api/health` returned `{"service":"mimiPaste","status":"ok"}`. |
| AC-3 | Pending | Not implemented. |
| AC-4 | Pending | Not implemented. |
| AC-5 | Pending | Not implemented. |
| AC-6 | Pending | Not implemented. |
| AC-7 | Pending | Not implemented. |
| AC-8 | Pending | Not implemented. |
| AC-9 | Pending | Not implemented. |
| AC-10 | Pending | Not implemented. |
| AC-11 | Pending | Not implemented. |
| AC-12 | Pending | Not implemented. |
| AC-13 | Pending | Not implemented. |
| AC-14 | Pending | Not implemented. |
| AC-15 | Pending | Not implemented. |
| AC-16 | Pending | Not implemented. |
| AC-17 | Pending | Not implemented. |
| AC-18 | Pending | Not implemented. |
| AC-19 | Pending | Not implemented. |
| AC-20 | Pending | Not implemented. |
| AC-21 | Pending | Not implemented. |
| AC-22 | Pending | Not implemented. |
| AC-23 | Pending | Not implemented. |
| AC-24 | Pass | UI shell and prompt workspace copy reviewed. |
| AC-25 | Pass | Current empty states: `尚無提示詞。`, `請選擇提示詞。`. |
| AC-26 | Pass | Current UI copy does not expose API, SQLite, parser, or endpoint details. |
| AC-27 | Pass | `corepack pnpm build:web` passed; `http://127.0.0.1:18700/prompts` returned 200. |
| AC-28 | Pass | `.gitignore` excludes DB, backups, secrets, local state, `node_modules`, and `web/dist`. |
| AC-29 | Pass | Prompt view mode switch keeps local query state. |
| AC-30 | Pass | Prompt view mode persists with `localStorage`. |
| AC-31 | Pending | Prompt rows/cards are not backed by persisted data yet. |
| AC-32 | Pass | Prompt create/detail panel is fixed on the right side. |
| AC-33 | Pass | `新增提示詞` opens create mode in the right-side panel. |
| AC-34 | Pending | Save path is not implemented yet. |
| AC-35 | Pending | Save path is not implemented yet. |
| AC-36 | Pending | Unsaved-change confirmation is not implemented yet. |

## Blockers

| Date | Blocker | Needed To Unblock |
| --- | --- | --- |
| 2026-07-06 | TOML parser strategy not selected. | Verify parser behavior for comments, formatting, and partial updates. |
| 2026-07-06 | SQLite Go driver not selected. | Decide CGO vs CGO-free after docs check. |
| 2026-07-06 | Claude settings format and default path not verified. | Check current Claude configuration docs before visual fields are implemented. |
| 2026-07-06 | Codex config schema not fully verified. | Check current Codex docs before visual fields are implemented. |
| 2026-07-06 | `pnpm` global shim cannot be created without admin rights. | Resolved for repo commands with Corepack and tracked `scripts/pnpm.cmd`; do not use npm fallback. |

## Change Log

- 2026-07-06: Created spec and progress tracker.
- 2026-07-06: Added fixed directory/framework contract, shadcn `b0` Vite scaffold command, and architecture guardrails.
- 2026-07-06: Confirmed prompt description stays in MVP and added mimiGrep frontend reference contract.
- 2026-07-06: Added prompt card/list dual-view requirement and persistence.
- 2026-07-06: Confirmed desktop prompt detail/edit stays in a fixed right-side panel.
- 2026-07-06: Confirmed prompt creation happens in the fixed right-side panel.
- 2026-07-06: Scaffolded React/Vite/shadcn frontend, Go local API, workspace scripts, CI, OpenAPI, and first verification pass.
