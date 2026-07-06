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

匯入會先驗證整份資料；只要其中一筆不合法，就不會寫入任何資料。

## Config Backups

套用設定檔前會先把目前檔案內容存成備份紀錄。還原備份前會要求確認，並把備份內容寫回原設定檔路徑。
