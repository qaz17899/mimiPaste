import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AppErrorBoundary } from "@/app/error-boundary"
import { ApiError, type ProblemDetails } from "@/lib/api/client"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("AppErrorBoundary", () => {
  it("shows the request reference and resets when requested", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    const onReset = vi.fn()

    render(
      <AppErrorBoundary onReset={onReset}>
        <ThrowError error={new ApiError(problem())} />
      </AppErrorBoundary>
    )

    expect(screen.getByText("畫面載入失敗。")).toBeTruthy()
    expect(screen.getByText("參考編號")).toBeTruthy()
    expect(screen.getByText("req_test")).toBeTruthy()

    await userEvent.click(screen.getByRole("button", { name: "重新載入" }))

    expect(onReset).toHaveBeenCalledTimes(1)
  })

  it("hides raw JavaScript error messages from the fallback", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)

    render(
      <AppErrorBoundary onReset={vi.fn()}>
        <ThrowError error={new Error("SQL syntax near stack trace")} />
      </AppErrorBoundary>
    )

    expect(screen.getByText("操作失敗。")).toBeTruthy()
    expect(screen.queryByText("SQL syntax near stack trace")).toBeNull()
  })
})

function ThrowError({ error }: { error: Error }) {
  throw error
  return null
}

function problem(): ProblemDetails {
  return {
    type: "https://mimipaste.local/problems/internal-error",
    title: "Internal error",
    status: 500,
    detail: "操作失敗，請稍後再試。",
    instance: "urn:mimipaste:request:req_test",
    code: "INTERNAL_ERROR",
    requestId: "req_test",
    retryable: true,
    details: {},
  }
}
