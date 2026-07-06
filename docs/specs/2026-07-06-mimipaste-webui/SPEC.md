# mimiPaste Web UI Spec

- Date: 2026-07-06
- Owner: qaz17899
- Status: Ready For Implementation
- Source Material: 本次對話、`README.md`、本機參考專案 `D:\mimiGrep\webui`

## Goal

mimiPaste 要成為一個本機優先的 Web UI，用來管理提示詞，並逐步擴充成 Codex、Claude 等 agent 設定檔的可視化管理工具。

第一版採用瀏覽器介面，但不是純前端單頁應用。原因是瀏覽器不能穩定、可靠地直接讀寫使用者電腦上的 `config.toml` 或 agent settings 檔案。因此系統需要一個本機 Go HTTP API，負責 SQLite、設定檔讀寫、備份、驗證與套用配置。前端只負責畫面與互動。

目標是讓使用者可以快速搜尋、編輯、分類、複製提示詞，也可以匯入現有 agent 設定檔、用表單或原文編輯設定、建立多個 profile，並安全地切換目前使用的配置。

## Non-Goals

- 不做雲端同步。
- 不做登入、帳號、多人協作。
- 不做遠端部署版 SaaS。
- 不做 Electron、Wails、Tauri 或桌面殼。
- 不在第一版支援 mobile-first 體驗。
- 不在第一版自動偵測所有 Codex 或 Claude 設定欄位；未知欄位必須保留在原文編輯中。
- 不在 MVP 做封存、建立副本、集合、提示詞變數、提示詞適用 agent。
- 不做靜默 fallback、mock 成功結果，或吞掉檔案/設定錯誤。

## Current State

目前 repo 只有 [README.md](D:/mimiPaste/README.md)，內容為專案標題，尚無前端、後端、資料庫、測試或文件結構。

遠端公開 repo 已建立：`https://github.com/qaz17899/mimiPaste`。

## Target State

專案結構必須採用下列分層。未經 spec 更新，不得新增平行命名如 `frontend/`、`backend/`、`client/`、`api-server/`、根目錄 `src/`，避免後續 agent 各做各的。

```text
mimiPaste/
├── .github/
│   └── workflows/
│       └── ci.yml
├── contracts/
│   └── openapi.yaml
├── data/
│   └── migrations/
├── docs/
│   ├── adr/
│   └── specs/
├── scripts/
│   ├── dev.ps1
│   ├── dev.sh
│   └── check.ps1
├── server/
│   ├── cmd/
│   │   └── mimipaste/
│   │       └── main.go
│   ├── internal/
│   │   ├── app/
│   │   ├── transport/
│   │   │   └── http/
│   │   ├── core/
│   │   ├── prompt/
│   │   ├── agent/
│   │   ├── configfile/
│   │   ├── profile/
│   │   ├── backup/
│   │   ├── importexport/
│   │   ├── settings/
│   │   ├── search/
│   │   ├── storage/
│   │   │   └── sqlite/
│   │   └── platform/
│   │       ├── filesystem/
│   │       ├── clock/
│   │       └── logging/
│   └── go.mod
├── web/
│   ├── src/
│   │   ├── app/
│   │   ├── routes/
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   └── layout/
│   │   ├── features/
│   │   │   ├── prompts/
│   │   │   ├── agents/
│   │   │   ├── config-sources/
│   │   │   ├── profiles/
│   │   │   ├── backups/
│   │   │   ├── import-export/
│   │   │   └── settings/
│   │   ├── hooks/
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   ├── clipboard/
│   │   │   ├── errors/
│   │   │   └── format/
│   │   └── test/
│   ├── components.json
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

執行模式：

- 開發模式：`web` 由 Vite dev server 提供，`/api` 代理到 Go server。
- 生產模式：Go server 提供 API，並可直接 serve `web/dist` 靜態檔。
- 使用者在瀏覽器開啟 `http://127.0.0.1:<port>` 使用 mimiPaste。
- SQLite 資料庫放在使用者指定或預設的本機資料目錄；不得放進 git repo。

建議技術棧：

- Frontend: React + Vite + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Routing: TanStack Router
- Server state: TanStack Query
- Editor: CodeMirror 6 優先；若需要更完整 IDE 體驗再評估 Monaco
- Backend: Go local HTTP API
- Database: SQLite + FTS5
- Migration: goose 或同等 Go migration 工具，實作前需查最新文件
- TOML: Go TOML parser，實作前需查最新 API 與註解保留能力

## Framework And Directory Contract

### Scaffold Contract

第一版必須用 `pnpm`。不得因本機缺少 `pnpm` 就靜默改用 `npm` 或 `bun`。若 `pnpm` 不存在，實作 agent 必須先啟用 Corepack 或明確停止並回報。

shadcn 初始化命令必須參考 mimiGrep，但改成 mimiPaste 的純 Web UI：

```bash
pnpm dlx shadcn@latest init --name web --preset b0 --template vite
```

若 `web/` 已先由其他工具建立，則改在 `web/` 內執行：

```bash
pnpm dlx shadcn@latest init --preset b0 --template vite
```

已驗證 `b0` preset 代表 shadcn `nova`、`neutral`、`lucide`、`inter`、`default radius`、`subtle menu accent`。不得手動猜 preset 內容；若要再查，使用 `shadcn preset decode b0`。

參考 mimiGrep 的前端慣例：

- 使用 Tailwind v4 與 `@tailwindcss/vite`。
- 使用 `@` alias 指向 `web/src`。
- `components.json` aliases 使用 `@/components`、`@/components/ui`、`@/lib`、`@/hooks`。
- `iconLibrary` 使用 `lucide`。
- Vite dev server 以 `/api` proxy 到本機後端。
- shadcn 元件只放在 `web/src/components/ui/`；業務元件不得混進 `ui/`。

### mimiGrep Frontend Reference Contract

mimiPaste 前端可以參考 `D:\mimiGrep\webui` 的寫法，但只能複製架構與模式，不得複製 mimiGrep 的 Discord domain、Tauri desktop、WebSocket collector、runtime reload 或 release updater 邏輯。

必須參考的部分：

- `webui/package.json`: React 19、Vite、TypeScript、Tailwind v4、shadcn、TanStack Router、TanStack Query、Vitest、Testing Library 的組合。
- `webui/components.json`: shadcn alias、lucide icon、neutral base color、CSS variables。
- `webui/vite.config.ts`: `@` alias、`@tailwindcss/vite` plugin、`/api` dev proxy。
- `webui/src/app/providers.tsx`: 全域 providers 集中在 app layer。
- `webui/src/app/router.tsx` 與 `webui/src/routes/__root.tsx`: TanStack Router root route + app shell layout。
- `webui/src/app/query-client.ts`: 集中管理 query keys 與 QueryClient。
- `webui/src/lib/api-client.ts`: 統一 API client、統一錯誤解析。
- `webui/src/components/AppSidebar.tsx` 與 `app-sidebar-config.ts`: 側邊欄資料與呈現分離。
- `webui/src/index.css`: Tailwind v4、shadcn CSS variables、font import、light/dark theme token。

必須改成 mimiPaste domain 的部分：

- Sidebar sections 改為 `工作區`、`Agent`、`系統`。
- Routes 改為 `/`、`/prompts`、`/agents`、`/profiles`、`/backups`、`/settings`。
- App name 改為 `mimiPaste`，副標題暫定 `提示詞與 Agent 設定`。
- 不建立 `dashboard`，首頁直接進入提示詞列表或 redirect 到 `/prompts`。
- 不建立 `collection`、`digests`、`summary`、`manage`、`insights` 等 mimiGrep domain routes。
- 不建立 desktop integration、collector status、runtime reload banner、WebSocket live state，除非後續 spec 明確要求。

Frontend implementation rules:

- Route config 必須用 typed route key 與 nav item config，不得把 sidebar 文字散落在多個 component。
- TanStack Query key 必須集中管理，不得在每個 component 手寫 ad hoc array。
- API 錯誤必須在 `web/src/lib/api/` 統一解析成 `{ code, message, details }`，UI 只顯示 message。
- UI layout 參考 mimiGrep 的 sidebar + header + scrollable content，但內容區不得做 marketing hero。
- Theme provider 與 theme toggle 可參考 mimiGrep，但第一版只需要 `system`、`light`、`dark`。
- 可以複製 mimiGrep 的 shadcn composition 方式；複製檔案時必須移除不屬於 mimiPaste domain 的 props、types、queries。

### Frontend Architecture

`web/src/app/` 只放全域啟動、provider、router、query client、app shell，不放功能業務邏輯。

`web/src/routes/` 只放 route definition 與頁面入口。頁面入口只組合 feature 元件，不直接寫資料轉換、API 呼叫或複雜狀態。

`web/src/features/<feature>/` 是業務功能的主要邊界。每個 feature 允許下列檔案：

- `<feature>-api.ts`: 呼叫 `web/src/lib/api` 的薄封裝。
- `<feature>-queries.ts`: TanStack Query keys、queries、mutations。
- `<feature>-types.ts`: UI 層型別；不得複製後端完整 domain model。
- `<feature>-state.ts`: 純前端狀態 reducer 或 selector。
- `<FeaturePanel>.tsx`: 主要畫面容器。
- `<small-component>.tsx`: 該 feature 私有元件。
- `<feature>.test.tsx`: 行為測試。

`web/src/components/ui/` 只放 shadcn CLI 產生或明確維護的基礎元件。

`web/src/components/layout/` 只放 app shell、sidebar、header、command palette、global dialogs。

`web/src/lib/api/` 是唯一允許直接 `fetch` 的地方。feature 不得各自手寫 `fetch`。

`web/src/lib/clipboard/` 是唯一允許碰 Clipboard API 的地方。複製失敗要丟出明確錯誤，不得回傳假成功。

### Backend Architecture

`server/cmd/mimipaste/main.go` 只做 wiring：讀設定、建立依賴、啟動 server。不得放業務邏輯。

`server/internal/core/` 放跨功能 domain 型別，例如 ID、時間、錯誤碼、分頁、排序、交易介面。不得 import SQLite、HTTP 或 OS 檔案系統。

每個業務 package，例如 `prompt`、`agent`、`configfile`、`profile`、`backup`，都必須採用：

```text
<feature>/
├── model.go
├── service.go
├── repository.go
├── errors.go
└── service_test.go
```

規則：

- `service.go` 放 use case。
- `repository.go` 只定義 interface。
- SQLite 實作放在 `server/internal/storage/sqlite/`。
- HTTP handler 放在 `server/internal/transport/http/`。
- service 不得 import HTTP、SQLite driver、路由器或具體檔案系統。
- 檔案讀寫必須透過 `platform/filesystem` interface 注入。
- 時間必須透過 `platform/clock` 注入，測試不得直接依賴現在時間。

`server/internal/configfile/` 是設定檔安全核心。所有讀寫 `config.toml`、Claude settings 或其他 agent 設定檔都必須經過這裡，不得讓其他 package 直接寫檔。

`server/internal/storage/sqlite/` 負責 DB connection、migration、transaction、repository implementations、FTS sync。不得把 business rule 寫在 SQL repository 裡；repository 只做資料存取與資料映射。

### API Contract

`contracts/openapi.yaml` 是 API 合約的文件來源。第一版若尚未引入 codegen，也必須先維護此檔；任何新增、刪除或改名 API route 都要同步更新。

前端 API client 必須集中在 `web/src/lib/api/`，錯誤統一轉成 UI 可理解的錯誤型別。後端錯誤碼必須穩定，不得讓前端依賴原始 Go error 字串。

### Forbidden Structure

不得建立：`backend/`、`frontend/`、`client/`、根目錄 `api/`、根目錄 `src/`、`web/src/services/`、`web/src/utils/`、`server/internal/services/`、`server/internal/utils/`、不對外提供 Go module API 時的 `server/pkg/`。

若找不到放置位置，代表 domain 還沒命名清楚，必須先更新 spec 或 ADR。

## UX Writing And Interface Copy

- Locale: Traditional Chinese (Taiwan)
- Voice: concise, professional, human-centric
- Required reference: `C:\Users\qaz17\ai-skills\shared\write-executable-spec\references\ux-writing-zh-tw.md`
- Acceptance focus: 使用者能理解狀態與下一步，不暴露後端細節。

Copy inventory:

- Primary navigation:
  - `提示詞`
  - `Agent`
  - `設定檔`
  - `備份`
  - `設定`
- Prompt actions:
  - `新增提示詞`
  - `儲存`
  - `複製`
  - `刪除`
- Prompt fields:
  - `標題`
  - `內容`
  - `描述`，可選，用於列表摘要與搜尋，不得作為必填欄位
  - `標籤`
- Search and filters:
  - Placeholder: `搜尋提示詞...`
  - Empty state: `找不到提示詞。請調整搜尋條件。`
  - Empty library: `尚無提示詞。請新增第一則提示詞。`
- Config actions:
  - `新增設定來源`
  - `匯入設定檔`
  - `驗證`
  - `預覽差異`
  - `套用設定檔`
  - `還原備份`
- Config fields:
  - `Agent 類型`
  - `設定檔路徑`
  - `設定檔名稱`
  - `目前使用中`
  - `原文編輯`
  - `可視化編輯`
- Config states:
  - Success: `設定已套用。`
  - Parse error: `設定格式有誤，請修正後再儲存。`
  - File error: `無法讀取設定檔，請確認路徑與權限。`
  - Diff empty: `沒有變更。`

Copy to remove:

- 不顯示「點擊左側選單切換頁面」這類明顯操作說明。
- 不顯示「呼叫 API」、「寫入 SQLite」、「透過後端解析」等實作細節。
- 不顯示「點擊儲存即可儲存」這類重複按鈕文字的描述。

## Required Skills

- `find-docs`: 實作前查 React、Vite、Go library、SQLite、shadcn/ui、CodeMirror/Monaco、TOML parser、migration tool 的最新文件。
- `shadcn`: 若使用 shadcn/ui，新增或調整元件前必須查專案與元件文件。
- `shadcn-component-discovery`: 建立資料表、表單、命令面板、對話框、diff viewer 或設定頁前，先確認是否有合適的 shadcn-compatible component。
- `shadcn-component-review`: 修改自訂 UI 元件後，用來檢查 shadcn 慣例、token、slot 與 composition 是否一致。
- `diagnosing-bugs`: 若設定檔讀寫、SQLite migration、FTS 搜尋或剪貼簿行為不穩，必須用診斷流程找根因，不得補靜默 fallback。

## Documentation And External Research

| Topic | Why It Matters | Required Source/Skill | Status | Notes |
| --- | --- | --- | --- | --- |
| React | 表單狀態、列表、互動編輯 | `find-docs` / Context7 `/reactjs/react.dev` | Verified | 2026-07-06 查到 React 官方文件建議以不可變方式更新表單物件，並可用 reducer 管理複雜狀態。 |
| Vite | React TS 專案、dev proxy、後端整合 | `find-docs` / Context7 `/vitejs/vite` | Verified | 2026-07-06 查到 Vite dev server proxy 只作用於開發模式；production 需由 Go serve 靜態檔或另行配置。 |
| shadcn/ui | 表單、對話框、表格、設定頁 UI | `shadcn` / Context7 `/shadcn-ui/ui` | Verified | 2026-07-06 查到 `init` 支援 `--template vite`、`--preset`、`--name`；本機用 `npx shadcn@latest preset decode b0` 驗證 `b0` 為 nova/neutral/lucide/inter。 |
| TanStack Router | Vite SPA routes 與型別安全路由 | `find-docs` / Context7 `/tanstack/router` | Verified | 2026-07-06 查到 root route 使用 `createRootRoute` 與 `Outlet`，本專案採 mimiGrep manual route tree。 |
| TanStack Query | API server state、cache、mutation | `find-docs` / Context7 `/tanstack/query` | Verified | 2026-07-06 查到 `QueryClientProvider`、`useQuery`、`useMutation` 與 mutation 後 invalidate pattern。 |
| Tailwind CSS | 設計 tokens 與 layout | shadcn CLI / Vite config | Verified | shadcn 初始化驗證 Tailwind v4，並加入 `@tailwindcss/vite`。 |
| Go | 本機 API、檔案操作、測試 timeout | local toolchain / go.dev | Verified | 本機使用 Go 1.26.3，server module 使用 `go 1.26` 與標準 `net/http`。 |
| SQLite | 本機資料庫、FTS5、migration | SQLite official docs | Pending | 實作前查 FTS5、WAL、foreign key、backup 相關文件。 |
| SQLite Go driver | Go 連 SQLite | `find-docs` | Pending | 需比較 `modernc.org/sqlite` 與 `github.com/mattn/go-sqlite3`，決定是否接受 CGO。 |
| TOML parser | Codex `config.toml` 解析與驗證 | `find-docs` | Pending | 必須確認是否能保留註解與原始格式；若不能，原文編輯不得自動重排整份檔案。 |
| CodeMirror / Monaco | 設定檔原文編輯器 | `find-docs` | Pending | 第一版優先 CodeMirror 6，實作前查 React integration 與 TOML syntax support。 |
| Browser Clipboard API | 一鍵複製提示詞 | MDN / `find-docs` | Pending | 失敗時要顯示明確錯誤，不做假成功。 |

## Destructive Refactor Contract

Not applicable. 目前沒有既有功能需要破壞或遷移。

## Requirements

1. 系統必須提供 React + Vite + TypeScript Web UI。
2. 系統必須提供 Go local HTTP API；不得讓前端直接依賴瀏覽器檔案 API 讀寫真實設定檔。
3. Go server 必須 expose JSON API，所有錯誤回應都要包含穩定錯誤碼與可讀訊息。
4. 系統必須使用 SQLite 儲存提示詞、標籤、agent 設定來源、profiles、備份紀錄與使用紀錄。
5. 系統必須支援 SQLite migration；啟動時 migration 失敗必須中止並顯示錯誤，不得跳過。
6. 提示詞必須支援新增、讀取、更新、刪除。
7. 刪除提示詞必須有明確確認；刪除後不提供封存或還原流程。
8. 提示詞必須支援標題、內容、描述、標籤、收藏、建立時間、更新時間、最近複製時間、複製次數；描述是可選欄位。
9. 提示詞列表必須支援全文搜尋、標籤篩選、收藏篩選。
10. 全文搜尋必須搜尋標題、內容、描述、標籤名稱。
11. 提示詞必須支援一鍵複製；複製成功才更新最近複製時間與複製次數。
12. 系統必須支援 JSON 匯入與匯出提示詞資料。
13. 匯入資料必須先驗證 schema；失敗時列出錯誤，不得部分寫入。
14. 系統必須提供 Agent 類型管理，第一版內建 `Codex` 與 `Claude`。
15. 系統必須允許新增自訂 Agent 類型，但自訂類型第一版只提供原文設定與 profile 管理。
16. 系統必須支援設定來源，包含 agent 類型、顯示名稱、設定檔路徑、格式、目前狀態。
17. 設定檔路徑必須由使用者明確新增或選擇；後端只能讀寫已註冊的設定來源。
18. 系統必須能讀取已註冊的 `config.toml` 或 settings 檔案。
19. 系統必須提供原文編輯器，讓使用者直接編輯設定檔內容。
20. 系統必須提供可視化編輯表單，僅顯示已支援且可安全映射的欄位。
21. 未知設定欄位必須保留，不得在可視化儲存時遺失。
22. 若 TOML parser 無法保留註解與格式，儲存可視化欄位時只能修改已知欄位，不得重寫整份檔案。
23. 儲存設定前必須解析並驗證格式；格式錯誤不得寫入檔案。
24. 套用 profile 前必須顯示 diff preview。
25. 套用 profile 前必須建立備份。
26. 備份必須包含原始檔案內容、agent 類型、設定來源、建立時間、套用前 profile id。
27. 系統必須支援從備份還原設定檔。
28. 還原備份前必須顯示 diff preview 並要求確認。
29. 系統必須支援多個 profile，例如 `日常`, `深度思考`, `低成本`, `專案 A`。
30. 每個 profile 必須包含 agent 類型、名稱、描述、設定內容、建立時間、更新時間。
31. 同一 agent 可有多個 profile，但同一設定來源只能有一個目前使用中的 profile。
32. 切換 profile 必須實際寫入對應設定檔；只更新資料庫狀態不算完成。
33. 設定檔套用失敗時不得更新目前使用中狀態。
34. UI 必須提供主導航：提示詞、Agent、設定檔、備份、設定。
35. UI 必須使用繁體中文（台灣）文案。
36. UI 不得顯示後端實作細節，例如 API、SQLite、parser、endpoint。
37. 空狀態文案必須短於 20 個中文字，並提供下一步。
38. 所有 destructive action 必須有明確確認，包括刪除提示詞、覆寫設定、還原備份。
39. 敏感欄位名稱若包含 `key`、`token`、`secret`、`password`，列表與表單預設必須遮蔽。
40. 敏感值不得寫入 log。
41. 系統不得把使用者設定檔、SQLite DB、備份檔、API key、token 提交到 repo。
42. 所有後端檔案讀寫錯誤必須回傳明確錯誤，不得自動建立假資料或假成功。
43. 專案必須使用 `pnpm` workspace；不得混用 npm lockfile、bun lockfile、yarn lockfile。
44. shadcn 必須以 `b0` preset 與 `vite` template 初始化。
45. `web/src/lib/api/` 是唯一允許直接呼叫 `fetch` 的前端位置。
46. Go service layer 不得 import HTTP、SQLite driver 或具體檔案系統 package。
47. 所有設定檔讀寫必須經過 `server/internal/configfile/`，其他 package 不得直接寫 agent 設定檔。
48. 新增 API route 時必須同步更新 `contracts/openapi.yaml`。
49. 不得新增 spec 未列出的根目錄架構；若需要新增，先更新 spec 或 ADR。
50. 提示詞頁必須支援卡片視圖與列表視圖，並提供清楚的視圖切換控制。
51. 使用者切換提示詞視圖後，下一次回到提示詞頁必須保留上次選擇。
52. 桌面版提示詞詳情與編輯必須固定在右側面板；一般查看、編輯、複製不得用 modal。
53. 新增提示詞必須在右側面板進入新建狀態，不得開 modal 或跳到獨立頁。
54. 提示詞新增與編輯必須手動儲存；不得在使用者輸入時自動寫入資料庫。

## Functional Scope

### Prompt Library

- Prompt workspace:
  - 預設採用左側瀏覽區、右側詳情/編輯區。
  - 桌面版右側詳情面板固定顯示；選取卡片或列表列時只更新右側內容，不跳頁、不開 modal。
  - 未選取提示詞時，右側顯示短空狀態：`請選擇提示詞。`
  - 點擊 `新增提示詞` 時，右側面板切換為新建表單，左側搜尋與篩選狀態保持不變。
  - 新建成功後，左側列表更新並選取新提示詞，右側面板顯示已儲存內容。
  - 新建取消時，若表單有未儲存變更，必須先確認；確認後回到前一個選取狀態或空狀態。
  - 瀏覽區支援 `卡片` 與 `列表` 兩種視圖。
  - 視圖切換使用 segmented control 或 icon toggle，卡片使用 grid icon，列表使用 list icon，並提供 tooltip。
  - 視圖偏好屬於 UI preference，第一版可存於 browser localStorage；不得寫入提示詞資料本身。
- Card view:
  - 適合瀏覽與挑選，顯示標題、描述、標籤、收藏狀態、最近複製。
  - 卡片高度必須穩定，長內容以截斷呈現，不得撐爆 layout。
  - 卡片點擊後在右側開啟詳情，不跳頁。
- List view:
  - 顯示標題、描述、標籤、收藏狀態、最近更新、最近複製。
  - 適合密集掃描，採用 table 或 compact row，不使用大型卡片。
  - 每列必須支援選取、複製、收藏切換與刪除入口。
  - 支援搜尋框與篩選列。
  - 支援排序：最近更新、最近複製、複製次數、標題。
- Detail editor:
  - 編輯標題、內容、描述、標籤、收藏狀態。
  - 描述欄位可留空，列表無描述時不得顯示空白佔位文字。
  - 內容欄位支援多行文字。
  - 編輯採手動儲存，提供 `儲存` 與 `取消`。
  - 有未儲存變更時，切換提示詞、離開頁面或取消編輯前必須確認。
  - 未儲存狀態只存在前端表單，不得提前寫入 SQLite。
- Copy flow:
  - 直接複製內容。
  - 複製失敗：顯示原因，不更新使用紀錄。
- Import/export:
  - 匯出 JSON 包含提示詞、標籤與關聯。
  - 匯入前顯示筆數與錯誤；驗證通過後一次交易寫入。

### Agent And Config Management

- Agent list:
  - 顯示 Codex、Claude、自訂 agent。
  - 顯示每個 agent 的設定來源數量與 profile 數量。
- Config source:
  - 新增設定來源：agent 類型、名稱、檔案路徑、格式。
  - 讀取設定：顯示目前檔案內容與解析狀態。
  - 驗證設定：回傳格式是否有效與錯誤位置。
- Profile editor:
  - 建立、編輯、刪除 profile。
  - 以原文編輯為基礎，逐步增加可視化欄位。
- Apply flow:
  - 選擇設定來源。
  - 選擇 profile。
  - 顯示 diff preview。
  - 建立備份。
  - 寫入設定檔。
  - 更新目前使用中狀態。
- Backup flow:
  - 列出備份。
  - 查看備份內容。
  - 比較目前檔案與備份。
  - 還原備份。

### Settings

- Database path:
  - 顯示目前 SQLite DB 路徑。
  - 支援變更前檢查目標目錄存在與可寫。
- Backup directory:
  - 顯示目前備份目錄。
  - 支援設定自訂備份目錄。
- Theme:
  - 支援系統、淺色、深色。
- Diagnostics:
  - 顯示 Go server 版本、DB migration 版本、前端 build 版本。
  - 不顯示敏感設定值。

## Data Model

Initial SQLite tables:

- `prompts`
  - `id TEXT PRIMARY KEY`
  - `title TEXT NOT NULL`
  - `content TEXT NOT NULL`
  - `description TEXT NOT NULL DEFAULT ''`
  - `favorite INTEGER NOT NULL DEFAULT 0`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
  - `last_copied_at TEXT NULL`
  - `copy_count INTEGER NOT NULL DEFAULT 0`
- `tags`
  - `id TEXT PRIMARY KEY`
  - `name TEXT NOT NULL UNIQUE`
  - `color TEXT NULL`
- `prompt_tags`
  - `prompt_id TEXT NOT NULL`
  - `tag_id TEXT NOT NULL`
  - composite primary key: `prompt_id`, `tag_id`
- `agents`
  - `id TEXT PRIMARY KEY`
  - `name TEXT NOT NULL UNIQUE`
  - `kind TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
- `config_sources`
  - `id TEXT PRIMARY KEY`
  - `agent_id TEXT NOT NULL`
  - `name TEXT NOT NULL`
  - `path TEXT NOT NULL`
  - `format TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
- `profiles`
  - `id TEXT PRIMARY KEY`
  - `agent_id TEXT NOT NULL`
  - `name TEXT NOT NULL`
  - `description TEXT NOT NULL DEFAULT ''`
  - `format TEXT NOT NULL`
  - `content TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
  - `updated_at TEXT NOT NULL`
- `active_profiles`
  - `config_source_id TEXT PRIMARY KEY`
  - `profile_id TEXT NOT NULL`
  - `applied_at TEXT NOT NULL`
- `config_backups`
  - `id TEXT PRIMARY KEY`
  - `config_source_id TEXT NOT NULL`
  - `profile_id TEXT NULL`
  - `path TEXT NOT NULL`
  - `content TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
- `prompt_usage_events`
  - `id TEXT PRIMARY KEY`
  - `prompt_id TEXT NOT NULL`
  - `event_type TEXT NOT NULL`
  - `created_at TEXT NOT NULL`
- `prompt_fts`
  - FTS5 virtual table for title, content, description, tags.

## API Contract

All API responses use JSON.

Error shape:

```json
{
  "error": {
    "code": "CONFIG_PARSE_ERROR",
    "message": "設定格式有誤，請修正後再儲存。",
    "details": {}
  }
}
```

Required routes:

- `GET /api/health`
- `GET /api/prompts`
- `POST /api/prompts`
- `GET /api/prompts/{id}`
- `PUT /api/prompts/{id}`
- `POST /api/prompts/{id}/copy`
- `DELETE /api/prompts/{id}`
- `GET /api/tags`
- `POST /api/tags`
- `GET /api/agents`
- `POST /api/agents`
- `GET /api/config-sources`
- `POST /api/config-sources`
- `GET /api/config-sources/{id}/read`
- `POST /api/config-sources/{id}/validate`
- `POST /api/config-sources/{id}/preview`
- `POST /api/config-sources/{id}/apply`
- `GET /api/profiles`
- `POST /api/profiles`
- `GET /api/profiles/{id}`
- `PUT /api/profiles/{id}`
- `DELETE /api/profiles/{id}`
- `GET /api/backups`
- `GET /api/backups/{id}`
- `POST /api/backups/{id}/preview-restore`
- `POST /api/backups/{id}/restore`
- `POST /api/import/prompts`
- `GET /api/export/prompts`
- `GET /api/settings`
- `PUT /api/settings`

## Implementation Plan

### Project Scaffolding

- Change: 建立 `web/` React Vite TS 專案與 `server/` Go module。
- Files likely affected: `package.json`, `pnpm-workspace.yaml`, `web/package.json`, `web/vite.config.ts`, `web/components.json`, `server/go.mod`, `server/cmd/mimipaste/main.go`, `contracts/openapi.yaml`, `README.md`.
- Edge cases: Node/pnpm 或 Go 版本不符合時要清楚失敗；不得自動改用 npm。
- Validation: `pnpm build`, `go test ./...`.

Required scaffold commands:

```bash
corepack enable
pnpm dlx shadcn@latest init --name web --preset b0 --template vite
```

If `web/` already exists:

```bash
cd web
pnpm dlx shadcn@latest init --preset b0 --template vite
```

### Backend Foundation

- Change: 建立 Go HTTP server、routing、JSON response、error shape、logging、config loading。
- Files likely affected: `server/internal/transport/http`, `server/internal/app`, `server/internal/settings`, `server/internal/platform/logging`.
- Edge cases: port already in use、DB path not writable、migration 失敗。
- Validation: backend unit tests and integration smoke test.

### Database And Migrations

- Change: 建立 SQLite schema、FTS5、migration runner、repository layer。
- Files likely affected: `data/migrations`, `server/internal/db`, `server/internal/prompts`.
- Edge cases: foreign key enforcement、transaction rollback、FTS index update。
- Validation: migration test with empty DB and existing DB.

### Prompt Features

- Change: 實作 prompt CRUD、tag、search、copy usage。
- Files likely affected: `server/internal/prompts`, `web/src/features/prompts`.
- Edge cases: duplicate tag names、empty content、copy failure。
- Validation: API tests and UI tests for create/search/copy/delete.

### Agent Config Features

- Change: 實作 agent、config source、profile、diff、apply、backup、restore。
- Files likely affected: `server/internal/agents`, `server/internal/configfiles`, `web/src/features/agents`.
- Edge cases: invalid path、permission denied、parse error、write failure after backup、unknown TOML fields。
- Validation: tests using temporary files; no tests write to real user config paths.

### Frontend UI

- Change: 建立 app shell、navigation、prompt list/detail、agent config pages、settings pages。
- Files likely affected: `web/src/app`, `web/src/routes`, `web/src/features`, `web/src/components/layout`, `web/src/components/ui`, `web/src/lib/api`.
- Edge cases: empty states、long prompt content、long file paths、small desktop viewport。
- Validation: build, lint, component tests, manual browser smoke test.

### Import Export

- Change: JSON schema validation、transactional import、download export。
- Files likely affected: `server/internal/importexport`, `web/src/features/import-export`.
- Edge cases: malformed JSON、duplicate IDs、partial invalid rows。
- Validation: import rejects invalid file with no DB changes.

## Acceptance Criteria

| ID | Criterion | Verification |
| --- | --- | --- |
| AC-1 | Repo contains `web/` React Vite TS app and `server/` Go app. | File tree and build commands. |
| AC-2 | Go server starts locally and `GET /api/health` returns success JSON. | `go test ./...` and manual curl. |
| AC-3 | SQLite migrations create all required tables from an empty DB. | Migration test with temp DB. |
| AC-4 | Migration failure stops startup and returns/logs a clear error. | Backend test with invalid migration. |
| AC-5 | User can create, edit, copy, and delete a prompt. | API tests and UI smoke test. |
| AC-6 | Prompt search matches title, content, description, and tags. | FTS test data assertions. |
| AC-7 | Prompt filters work for tags and favorites. | UI/API tests. |
| AC-8 | Copying a prompt succeeds only when clipboard/API operation succeeds. | UI test with mocked clipboard success/failure. |
| AC-9 | Copy failure shows a clear error and does not increment usage counters. | UI/API test. |
| AC-10 | Deleting a prompt requires explicit confirmation. | UI/API test. |
| AC-11 | Deleted prompts no longer appear in prompt list or search results. | UI/API test. |
| AC-12 | JSON import is transactional and leaves DB unchanged on validation failure. | Backend test. |
| AC-13 | JSON export includes prompts, tags, and relationships. | Backend test. |
| AC-14 | Built-in Codex and Claude agent types exist after initial setup. | DB seed/API test. |
| AC-15 | User can register a config source with path and agent type. | API/UI test with temp file path. |
| AC-16 | Backend refuses to read/write paths that are not registered config sources. | Backend security test. |
| AC-17 | User can read and validate a registered TOML config file. | Backend test using temp TOML. |
| AC-18 | Invalid config content is not written to disk. | Backend test. |
| AC-19 | Applying a profile shows diff, creates backup, writes file, and updates active profile. | Integration test with temp file. |
| AC-20 | If profile apply fails, active profile state is not updated. | Integration test with forced write failure. |
| AC-21 | Backup restore shows diff and requires explicit confirmation. | UI/API test. |
| AC-22 | Unknown config fields are preserved after visual edit. | Backend test with unknown TOML fields. |
| AC-23 | Sensitive values are masked in UI and absent from logs. | Unit test/log assertion/manual check. |
| AC-24 | UI copy uses Traditional Chinese (Taiwan). | Manual review against UX rules. |
| AC-25 | Empty states are under 20 Chinese words and provide next action. | Manual review/component test snapshot. |
| AC-26 | User-facing copy does not mention backend implementation details. | Manual review. |
| AC-27 | Production build can be served by Go server. | Build and smoke test. |
| AC-28 | No generated DB, backup, secret, or user config file is tracked by git. | `git status --ignored` and `.gitignore` review. |
| AC-29 | Prompt page can switch between card view and list view without losing current search/filter state. | UI/component test. |
| AC-30 | Prompt view preference persists after leaving and returning to the prompt page. | UI/component test with localStorage. |
| AC-31 | Card view and list view both support selecting a prompt, copying it, toggling favorite, and opening delete confirmation. | UI/component test. |
| AC-32 | Selecting a prompt updates the fixed right-side detail panel without opening a modal or navigating away. | UI/component test. |
| AC-33 | Clicking `新增提示詞` opens create mode in the right-side panel and preserves current search/filter state. | UI/component test. |
| AC-34 | Successful prompt creation selects the new prompt and shows it in the right-side panel. | UI/component test. |
| AC-35 | Prompt create/edit writes to the backend only after the user clicks `儲存`. | UI/API test. |
| AC-36 | Unsaved prompt changes trigger confirmation before switching selection, cancelling, or leaving the page. | UI/component test. |

## Verification Commands

Frontend:

```bash
cd web
pnpm install
pnpm lint
pnpm test
pnpm build
```

Backend:

```bash
cd server
go test ./... -timeout=60s
go test ./... -race -timeout=60s
```

Full app smoke test:

```bash
cd server
go run ./cmd/mimipaste
```

Git hygiene:

```bash
git status --short
git status --ignored --short
```

## Risks And Blockers

- TOML 註解與格式保留能力尚未確認。若 parser 無法保留格式，實作必須改用局部 patch 或原文模式，不能整份重排設定檔。
- Claude settings 檔案格式與預設路徑需要確認；第一版可以先讓使用者手動新增路徑。
- Codex config 欄位完整 schema 需要查官方文件；第一版可先支援原文編輯與少量已驗證欄位。
- Browser Clipboard API 在不同瀏覽器權限行為不同；失敗要顯示錯誤，不得假裝複製成功。
- SQLite Go driver 選型會影響安裝與跨平台編譯；實作前必須決定是否接受 CGO。
- shadcn/ui 與 Tailwind 的目前安裝流程需實作前查最新文件。
