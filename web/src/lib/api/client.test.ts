import { afterEach, describe, expect, it, vi } from "vitest"

import { ApiError, apiRequest, userErrorMessage } from "@/lib/api/client"
import { UserVisibleError } from "@/lib/errors/user-visible-error"

const BAD_REQUEST_STATUS = 400
const INTERNAL_ERROR_STATUS = 500

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("apiRequest", () => {
  it("throws full Problem Details from application/problem+json responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(problem({ status: BAD_REQUEST_STATUS }), {
          contentType: "application/problem+json",
          status: BAD_REQUEST_STATUS,
        })
      )
    )

    await expect(apiRequest("/api/prompts")).rejects.toMatchObject({
      code: "INVALID_INPUT",
      detail: "標題不可空白。",
      details: { field: "title" },
      requestId: "req_test",
      retryable: false,
      status: BAD_REQUEST_STATUS,
      title: "Invalid input",
      type: "https://mimipaste.local/problems/invalid-input",
    })
  })

  it("rejects legacy error envelopes as invalid problem responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: { code: "INVALID_INPUT", message: "old", details: {} } },
            { contentType: "application/json", status: BAD_REQUEST_STATUS }
          )
        )
    )

    await expect(apiRequest("/api/prompts")).rejects.toMatchObject({
      code: "INVALID_PROBLEM_RESPONSE",
      detail: "伺服器回傳無法辨識的錯誤格式。",
      retryable: false,
      status: BAD_REQUEST_STATUS,
    })
  })

  it.each([["array", []], ["null", null], ["missing", undefined]])(
    "rejects malformed Problem Details bodies with %s details",
    async (_name, details) => {
      const body: Record<string, unknown> = {
        ...problem({ status: BAD_REQUEST_STATUS }),
      }
      if (details === undefined) {
        delete body.details
      } else {
        body.details = details
      }
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          jsonResponse(body, {
            contentType: "application/problem+json",
            status: BAD_REQUEST_STATUS,
          })
        )
      )

      await expect(apiRequest("/api/prompts")).rejects.toMatchObject({
        code: "INVALID_PROBLEM_RESPONSE",
        detail: "伺服器回傳無法辨識的錯誤格式。",
        retryable: false,
        status: BAD_REQUEST_STATUS,
      })
    }
  )

  it("turns fetch failures into a user-facing network problem", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("failed")))

    await expect(apiRequest("/api/prompts")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      detail: "無法連線到本機服務，請確認服務仍在執行。",
      retryable: true,
      status: 0,
    })
  })
})

describe("userErrorMessage", () => {
  it("uses safe error details and hides raw Error messages", () => {
    expect(userErrorMessage(new ApiError(problem()))).toBe("標題不可空白。")
    expect(
      userErrorMessage(
        new UserVisibleError("無法使用剪貼簿，請確認瀏覽器權限。")
      )
    ).toBe("無法使用剪貼簿，請確認瀏覽器權限。")
    expect(userErrorMessage("bad")).toBe("操作失敗。")
    expect(userErrorMessage(new Error("SQL syntax near stack trace"))).toBe(
      "操作失敗。"
    )
  })
})

function jsonResponse(
  body: unknown,
  options: { contentType: string; status: number }
) {
  return new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": options.contentType,
      "X-Request-Id": "req_test",
    },
    status: options.status,
  })
}

function problem(options: { status?: number } = {}) {
  return {
    type: "https://mimipaste.local/problems/invalid-input",
    title: "Invalid input",
    status: options.status ?? INTERNAL_ERROR_STATUS,
    detail: "標題不可空白。",
    instance: "urn:mimipaste:request:req_test",
    code: "INVALID_INPUT",
    requestId: "req_test",
    retryable: false,
    details: { field: "title" },
  }
}
