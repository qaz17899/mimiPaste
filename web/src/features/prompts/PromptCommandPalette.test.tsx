import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PromptCommandPalette } from "@/features/prompts/PromptCommandPalette"
import type { Prompt } from "@/features/prompts/prompt-types"

const copyTextMock = vi.hoisted(() => vi.fn())

vi.mock("@/lib/clipboard/clipboard", () => ({
  copyText: copyTextMock,
}))

const prompt: Prompt = {
  id: "prompt_1",
  title: "Deploy note",
  content: "Ship it",
  description: "",
  tags: [],
  favorite: false,
  created_at: "2026-07-07T00:00:00Z",
  updated_at: "2026-07-07T00:00:00Z",
  copy_count: 0,
}

afterEach(() => {
  cleanup()
  copyTextMock.mockReset()
  vi.unstubAllGlobals()
})

describe("PromptCommandPalette", () => {
  it("opens from the keyboard and copies a selected prompt", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    vi.stubGlobal("ResizeObserver", TestResizeObserver)
    Element.prototype.scrollIntoView = vi.fn()
    copyTextMock.mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderWithQueryClient(<PromptCommandPalette />)

    await user.keyboard("{Control>}k{/Control}")
    expect(await screen.findByRole("dialog", { name: "搜尋提示詞" })).toBeTruthy()
    expect(await screen.findByText("Deploy note")).toBeTruthy()

    await user.keyboard("{Enter}")

    await waitFor(() => {
      expect(copyTextMock).toHaveBeenCalledWith("Ship it")
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/prompts/prompt_1/copy",
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

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function mockFetch(input: RequestInfo | URL, init?: RequestInit): Response {
  const path = String(input)
  if (path === "/api/prompts?sort=updated") {
    return jsonResponse({ prompts: [prompt] })
  }
  if (path === "/api/prompts/prompt_1/copy" && init?.method === "POST") {
    return jsonResponse({ ...prompt, copy_count: 1 })
  }
  return jsonResponse({})
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  })
}
