import { describe, expect, it } from "vitest"

import { shouldRetryQuery } from "@/app/query-client"
import { ApiError, type ProblemDetails } from "@/lib/api/client"

describe("shouldRetryQuery", () => {
  it("uses Problem Details retryability instead of guessing from status", () => {
    expect(
      shouldRetryQuery(0, new ApiError(problem({ retryable: true })))
    ).toBe(true)
    expect(
      shouldRetryQuery(0, new ApiError(problem({ retryable: false })))
    ).toBe(false)
  })

  it("stops after the configured retry limit", () => {
    expect(
      shouldRetryQuery(1, new ApiError(problem({ retryable: true })))
    ).toBe(false)
  })

  it("does not retry unknown JavaScript errors", () => {
    expect(shouldRetryQuery(0, new Error("render bug"))).toBe(false)
  })
})

function problem(overrides: Partial<ProblemDetails> = {}): ProblemDetails {
  return {
    type: "https://mimipaste.local/problems/internal-error",
    title: "Internal error",
    status: 500,
    detail: "操作失敗，請稍後再試。",
    instance: "urn:mimipaste:request:req_test",
    code: "INTERNAL_ERROR",
    requestId: "req_test",
    retryable: false,
    details: {},
    ...overrides,
  }
}
