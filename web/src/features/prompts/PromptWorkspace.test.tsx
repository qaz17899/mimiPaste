import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PromptWorkspace } from "@/features/prompts/PromptWorkspace"
import type { Prompt } from "@/features/prompts/prompt-types"

const copyTextMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/clipboard/clipboard", () => ({
  copyText: copyTextMock,
}))

const prompt: Prompt = {
  id: "prompt_1",
  title: "Deploy note",
  content: "Project: {{project}}\nOwner: {{ owner }}",
  description: "Release prompt",
  tags: [{ id: "tag_ops", name: "Ops", color: "#10b981" }],
  favorite: false,
  created_at: "2026-07-07T00:00:00Z",
  updated_at: "2026-07-07T00:00:00Z",
  copy_count: 0,
}

const version = {
  id: "version_1",
  prompt_id: prompt.id,
  version: 1,
  title: "Deploy note old",
  content: "Project: old",
  description: "Before edit",
  tags: [],
  favorite: false,
  created_at: "2026-07-07T00:00:00Z",
}

afterEach(() => {
  cleanup()
  copyTextMock.mockReset()
  vi.unstubAllGlobals()
})

describe("PromptWorkspace", () => {
  it("fills variables before copying a prompt", async () => {
    const fetchMock = vi.fn(mockFetch)
    copyTextMock.mockResolvedValue(undefined)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    renderWithQueryClient(<PromptWorkspace />)

    await screen.findByText("Deploy note")
    const tagSwatch = screen
      .getByText("Ops")
      .querySelector("[data-slot='prompt-tag-color']")
    expect(tagSwatch?.getAttribute("data-color")).toBe("#10b981")
    await user.click(screen.getByRole("button", { name: "複製提示詞" }))
    await user.type(screen.getByLabelText("project"), "mimiPaste")
    await user.type(screen.getByLabelText("owner"), "Codex")
    await user.click(screen.getByRole("button", { name: "複製" }))

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith(
        "Project: mimiPaste\nOwner: Codex"
      )
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompts/prompt_1/copy",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  it("does not save rendered variable content as a prompt edit", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    copyTextMock.mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderWithQueryClient(<PromptWorkspace />)

    await user.click(await screen.findByRole("button", { name: "複製提示詞" }))
    await user.type(screen.getByLabelText("project"), "mimiPaste")
    await user.type(screen.getByLabelText("owner"), "Codex")
    await user.click(screen.getByRole("button", { name: "複製" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompts/prompt_1/copy",
        expect.objectContaining({ method: "POST" })
      )
    })
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/prompts/prompt_1",
      expect.objectContaining({ method: "PUT" })
    )
  })

  it("keeps the variable dialog open when a required value is missing", async () => {
    vi.stubGlobal("fetch", vi.fn(mockFetch))
    copyTextMock.mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderWithQueryClient(<PromptWorkspace />)

    await user.click(await screen.findByRole("button", { name: "複製提示詞" }))
    await user.type(screen.getByLabelText("project"), "mimiPaste")
    await user.click(screen.getByRole("button", { name: "複製" }))

    expect(await screen.findByText("缺少必要欄位。")).toBeTruthy()
    expect(screen.getByRole("dialog", { name: "填入變數" })).toBeTruthy()
  })

  it("shows prompt history and confirms rollback", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    renderWithQueryClient(<PromptWorkspace />)

    await user.click(await screen.findByText("Deploy note"))
    await user.click(screen.getByRole("button", { name: "歷史" }))

    expect(await screen.findByText("Deploy note old")).toBeTruthy()
    expect(screen.getByText(/歷史版本 #1/)).toBeTruthy()

    await user.click(screen.getByRole("button", { name: "還原" }))
    await user.click(last(screen.getAllByRole("button", { name: "還原" })))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompts/prompt_1/rollback",
        expect.objectContaining({
          body: JSON.stringify({ version_id: "version_1" }),
          method: "POST",
        })
      )
    })
  })

  it("previews an import before confirming writes", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    const { container } = renderWithQueryClient(<PromptWorkspace />)
    const input = fileInput(container)
    await user.upload(input, importFile(validImportJSON()))

    expect(await screen.findByText("匯入預覽")).toBeTruthy()
    expect(screen.getByText("新增 1")).toBeTruthy()
    expect(screen.getByText("更新 1")).toBeTruthy()
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/import/prompts/preview",
      expect.objectContaining({ method: "POST" })
    )
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/import/prompts/confirm",
      expect.anything()
    )

    await user.click(screen.getByRole("button", { name: "確認匯入" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/import/prompts/confirm",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  it("shows invalid JSON without writing import data", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    const { container } = renderWithQueryClient(<PromptWorkspace />)
    await user.upload(fileInput(container), importFile("{bad json"))

    expect(await screen.findByText("檔案不是有效的 JSON。")).toBeTruthy()
    expect(fetchMock).not.toHaveBeenCalledWith(
      "/api/import/prompts/confirm",
      expect.anything()
    )
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
  if (path === "/api/prompts?sort=updated") {
    return jsonResponse({ prompts: [prompt] })
  }
  if (path === "/api/tags") return jsonResponse({ tags: [] })
  if (path === "/api/prompts/prompt_1/copy" && init?.method === "POST") {
    return jsonResponse({ ...prompt, copy_count: 1 })
  }
  if (path === "/api/prompts/prompt_1/versions") {
    return jsonResponse({ versions: [version] })
  }
  if (path === "/api/prompts/prompt_1/rollback" && init?.method === "POST") {
    return jsonResponse({ ...prompt, content: version.content })
  }
  if (path === "/api/import/prompts/preview" && init?.method === "POST") {
    return jsonResponse({
      added: 1,
      updated: 1,
      skipped: 0,
      invalid: 0,
      items: [
        { index: 0, id: "prompt_2", title: "Fresh", action: "added" },
        { index: 1, id: "prompt_1", title: "Deploy note", action: "updated" },
      ],
    })
  }
  if (path === "/api/import/prompts/confirm" && init?.method === "POST") {
    return jsonResponse({
      status: "ok",
      preview: { added: 1, updated: 1, skipped: 0, invalid: 0, items: [] },
    })
  }
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

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]')
  if (!(input instanceof HTMLInputElement)) {
    throw new Error("file input not found")
  }
  return input
}

function importFile(content: string): File {
  return new File([content], "prompts.json", { type: "application/json" })
}

function validImportJSON(): string {
  return JSON.stringify({
    prompts: [
      { id: "prompt_2", title: "Fresh", content: "fresh" },
      { id: "prompt_1", title: "Deploy note", content: "updated" },
    ],
  })
}
