import { render, screen } from "@testing-library/react"
import { beforeAll, describe, expect, it, vi } from "vitest"

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

describe("AppProviders", () => {
  it("renders the prompt workspace", async () => {
    render(<AppProviders />)

    expect(await screen.findByPlaceholderText("搜尋提示詞...")).toBeTruthy()
    expect(screen.getAllByText("提示詞").length).toBeGreaterThan(0)
  })
})
