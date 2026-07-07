# mimiPaste

本機優先的提示詞與 Agent 設定管理 Web UI。

## Development

需要 Node.js、Corepack、pnpm 與 Go。Windows 若全域 `pnpm` shim 不能建立，請用 repo 內的 `scripts\pnpm.cmd`。

```powershell
corepack prepare pnpm@latest --activate
.\scripts\pnpm.cmd install
.\scripts\pnpm.cmd build:web
go -C server test ./... -timeout=60s
```

啟動開發環境：

```powershell
.\scripts\dev.ps1
```

單一 Go server 可直接提供 API 與 `web/dist`：

```powershell
.\scripts\pnpm.cmd build:web
go -C server run ./cmd/mimipaste
```

預設網址是 <http://127.0.0.1:18700>。

## Local Data

預設資料庫放在使用者設定目錄的 `mimiPaste/mimipaste.db`，可用環境變數覆蓋：

- `MIMIPASTE_ADDR`
- `MIMIPASTE_DATA_DIR`
- `MIMIPASTE_DB_PATH`
- `MIMIPASTE_BACKUP_DIR`
- `MIMIPASTE_MIGRATIONS_DIR`
- `MIMIPASTE_STATIC_DIR`

SQLite DB、備份、使用者設定檔與 secrets 都不應提交到 git。

## Import / Export

提示詞匯出格式：

```json
{
  "prompts": [
    {
      "title": "範例",
      "description": "",
      "content": "提示詞內容",
      "tags": [],
      "favorite": false
    }
  ]
}
```

匯入會先顯示預覽，列出新增、更新、略過與錯誤筆數；確認後才會寫入。只要其中一筆不合法，就不會寫入任何資料。舊的直接匯入 API 會被拒絕，避免略過預覽。

## Prompt Workflow

提示詞內容支援 `{{name}}` 變數。複製前會先請使用者填入變數值，複製後只會更新使用次數，不會改寫原提示詞。

提示詞更新與匯入覆蓋會保存歷史版本。可在提示詞詳情查看差異並還原，還原前目前內容會先保存成新的歷史版本。

頁首搜尋按鈕與 `Ctrl+K` / `⌘K` 可開啟命令面板，快速搜尋並複製提示詞。標籤顏色會在列表、卡片、詳情與設定中一致顯示。

## Config Backups

套用設定檔前會先在 `MIMIPASTE_BACKUP_DIR` 指定的目錄建立可復原的備份檔，SQLite 只保存備份中繼資料與檔案路徑。還原備份前會先建立一份還原前備份，再把備份內容寫回原設定檔路徑。

備份可釘選、匯出、刪除與清理。清理只會刪除未釘選備份；如果備份檔無法寫入或讀取，套用與還原會直接失敗，不會改用資料庫內容假裝成功。

## Sensitive Config Values

設定檔、配置與備份內容會在預設畫面遮蔽常見敏感欄位，例如 `api_key`、`token`、`secret`、`password`、`authorization` 與 `credential`。需要查看原文時，必須在本次畫面操作中按 `顯示完整內容`；再次按 `隱藏敏感內容` 可回到遮蔽狀態。

如果畫面內容仍是遮蔽值，儲存會被阻擋，避免把 `********` 寫回設定檔。

## API Errors

API 錯誤使用 RFC 9457 Problem Details，回應類型是 `application/problem+json`。
舊的 `{ "error": ... }` 格式已移除，不再相容。

每個 API 回應都會包含 `X-Request-Id`。錯誤內容也會包含同一個 `requestId`，
可用來對照 server log。

API 錯誤 log 會以 JSON event 輸出，並遮蔽常見敏感欄位與 `password=...`、
`token=...`、`authorization=...` 這類值。
