import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { BackupsWorkspace } from "@/features/backups/BackupsWorkspace"
import type { Backup } from "@/features/backups/backup-types"

const backup: Backup = {
  id: "backup_1",
  agent_name: "Codex",
  config_source_id: "source_1",
  config_source_name: "Codex local",
  content: "model = \"old\"\n",
  content_masked: false,
  content_path: "D:\\backups\\backup_1.toml",
  created_at: "2026-07-07T00:00:00Z",
  display_content: "model = \"old\"\n",
  format: "toml",
  path: "D:\\config.toml",
  pinned: false,
}

const maskedBackup: Backup = {
  ...backup,
  content: "api_key = \"secret-value\"\n",
  content_masked: true,
  display_content: "api_key = \"********\"\n",
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("BackupsWorkspace", () => {
  it("pins, prunes, and deletes backups through the API", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    renderWithQueryClient(<BackupsWorkspace />)
    await user.click(await screen.findByText("Codex local"))
    await user.click(screen.getByRole("button", { name: "釘選" }))
    await user.click(screen.getByRole("button", { name: "刪除" }))
    await user.click(last(screen.getAllByRole("button", { name: "刪除" })))
    await user.click(screen.getByRole("button", { name: "清理備份" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backups/backup_1/pin",
        expect.objectContaining({ method: "PUT" })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backups/prune",
        expect.objectContaining({ method: "POST" })
      )
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backups/backup_1",
        expect.objectContaining({ method: "DELETE" })
      )
    })
  })

  it("hides backup secrets until the user reveals them", async () => {
    vi.stubGlobal("fetch", vi.fn(mockMaskedBackupFetch))
    const user = userEvent.setup()

    renderWithQueryClient(<BackupsWorkspace />)
    await user.click(await screen.findByText("Codex local"))

    expect(screen.getByText(/api_key = "\*\*\*\*\*\*\*\*"/)).toBeTruthy()
    expect(screen.queryByText(/secret-value/)).toBeNull()

    await user.click(screen.getByRole("button", { name: "顯示完整內容" }))

    expect(screen.getByText(/secret-value/)).toBeTruthy()
  })

  it("previews, exports, and restores a backup", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    stubDownloadURL()
    const user = userEvent.setup()

    renderWithQueryClient(<BackupsWorkspace />)
    await user.click(await screen.findByText("Codex local"))
    await user.click(screen.getByRole("button", { name: "預覽差異" }))
    expect((await screen.findAllByText(/model = "old"/)).length).toBeGreaterThan(0)

    await user.click(screen.getByRole("button", { name: "匯出" }))
    await user.click(screen.getByRole("button", { name: "還原備份" }))
    await user.click(screen.getByRole("button", { name: "還原" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backups/backup_1/export",
        undefined
      )
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/backups/backup_1/restore",
        expect.objectContaining({ method: "POST" })
      )
    })
  })
})

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Response {
  const path = String(input)
  if (path === "/api/backups" && !init) return jsonResponse({ backups: [backup] })
  if (path === "/api/backups/backup_1/pin") {
    return jsonResponse({ ...backup, pinned: true })
  }
  if (path === "/api/backups/prune") {
    return jsonResponse({ deleted: [], kept: 1 })
  }
  if (path === "/api/backups/backup_1" && init?.method === "DELETE") {
    return new Response(null, { status: 204 })
  }
  if (path === "/api/backups/backup_1/preview-restore") {
    return jsonResponse({
      changed: true,
      diff: "--- 目前內容\n+++ 備份內容\n- model = \"new\"\n+ model = \"old\"\n",
    })
  }
  if (path === "/api/backups/backup_1/export") {
    return jsonResponse({ filename: "backup.toml", content: backup.content })
  }
  if (path === "/api/backups/backup_1/restore") {
    return jsonResponse({
      operation: {
        id: "operation_1",
        kind: "restore",
        status: "completed",
        config_source_id: backup.config_source_id,
        backup_id: backup.id,
        created_at: "2026-07-07T00:00:00Z",
        updated_at: "2026-07-07T00:00:00Z",
      },
      config: {},
    })
  }
  return jsonResponse({})
}

function mockMaskedBackupFetch(input: RequestInfo | URL): Response {
  const path = String(input)
  if (path === "/api/backups") return jsonResponse({ backups: [maskedBackup] })
  return jsonResponse({})
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  })
}

function last<T>(items: T[]): T {
  return items[items.length - 1]
}

function stubDownloadURL() {
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mimipaste"),
    revokeObjectURL: vi.fn(),
  })
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(
    () => undefined
  )
}
