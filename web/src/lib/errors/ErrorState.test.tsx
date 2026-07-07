import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, type ProblemDetails } from "@/lib/api/client"
import { ErrorState } from "@/lib/errors/ErrorState"

afterEach(() => {
  cleanup()
})

describe("ErrorState", () => {
  it("renders page errors with request references", async () => {
    const onRetry = vi.fn()

    render(
      <ErrorState
        error={new ApiError(problem())}
        onRetry={onRetry}
        surface="page"
      />
    )

    expect(screen.getByText("資料載入失敗。")).toBeTruthy()
    expect(screen.getByText("操作失敗，請稍後再試。")).toBeTruthy()
    expect(screen.getByText("參考編號")).toBeTruthy()
    expect(screen.getByText("req_test")).toBeTruthy()

    await userEvent.click(screen.getByRole("button", { name: "重新載入" }))

    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it("hides raw errors without request references", () => {
    render(
      <ErrorState error={new Error("SQL syntax near stack")} surface="page" />
    )

    expect(screen.getByText("資料載入失敗，請稍後再試。")).toBeTruthy()
    expect(screen.queryByText("SQL syntax near stack")).toBeNull()
    expect(screen.queryByText("參考編號")).toBeNull()
  })
})

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
