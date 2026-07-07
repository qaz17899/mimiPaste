import { describe, expect, it } from "vitest"

import { ApiError, type ProblemDetails } from "@/lib/api/client"
import {
  actionErrorMessage,
  errorDisplay,
} from "@/lib/errors/display-policy"
import { UserVisibleError } from "@/lib/errors/user-visible-error"

describe("errorDisplay", () => {
  it("keeps action errors safe without showing request references", () => {
    const display = errorDisplay(new ApiError(problem()), "action")

    expect(display).toMatchObject({
      message: "操作失敗，請稍後再試。",
      requestId: "req_test",
      retryable: true,
      showRequestReference: false,
    })
  })

  it("shows request references for page and crash surfaces", () => {
    expect(errorDisplay(new ApiError(problem()), "page")).toMatchObject({
      requestId: "req_test",
      showRequestReference: true,
    })
    expect(errorDisplay(new ApiError(problem()), "crash")).toMatchObject({
      requestId: "req_test",
      showRequestReference: true,
    })
  })

  it("hides raw Error messages and supports local user-visible errors", () => {
    expect(actionErrorMessage(new Error("SQL syntax near stack trace"))).toBe(
      "操作失敗。"
    )
    expect(actionErrorMessage(new UserVisibleError("無法使用剪貼簿。"))).toBe(
      "無法使用剪貼簿。"
    )
  })

  it("adds operation recovery guidance to action errors", () => {
    const error = new ApiError(
      problem({
        details: {
          guidance: "如內容不正確，請用這份備份還原。",
        },
      })
    )

    expect(actionErrorMessage(error)).toBe(
      "操作失敗，請稍後再試。 如內容不正確，請用這份備份還原。"
    )
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
    retryable: true,
    details: {},
    ...overrides,
  }
}
