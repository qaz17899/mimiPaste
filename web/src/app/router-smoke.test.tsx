import { render, screen } from "@testing-library/react"
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest"

import { AppProviders } from "@/app/providers"

beforeAll(() => {
  window.scrollTo = vi.fn()
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(mockFetch))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("AppProviders", () => {
  it("renders the prompt workspace", async () => {
    render(<AppProviders />)

    expect(await screen.findByPlaceholderText("搜尋提示詞...")).toBeTruthy()
    expect(screen.getAllByText("提示詞").length).toBeGreaterThan(0)
  })
})

function mockFetch(input: RequestInfo | URL): Response {
  const path = String(input)
  if (path.startsWith("/api/prompts")) return jsonResponse({ prompts: [] })
  if (path === "/api/tags") return jsonResponse({ tags: [] })
  return jsonResponse({})
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  })
}
