import {
  ApiError,
  errorRequestID,
  userErrorMessage,
} from "@/lib/api/client"

export type ErrorDisplaySurface = "action" | "page" | "crash"

export type ErrorDisplay = {
  message: string
  requestId: string | null
  retryable: boolean
  showRequestReference: boolean
}

export function errorDisplay(
  error: unknown,
  surface: ErrorDisplaySurface
): ErrorDisplay {
  const requestId = errorRequestID(error)
  return {
    message: userErrorMessage(error, fallbackForSurface(surface)),
    requestId,
    retryable: error instanceof ApiError ? error.retryable : false,
    showRequestReference: requestId !== null && surface !== "action",
  }
}

export function actionErrorMessage(error: unknown): string {
  const message = errorDisplay(error, "action").message
  const guidance = operationGuidance(error)
  if (!guidance) return message
  return `${message} ${guidance}`
}

function fallbackForSurface(surface: ErrorDisplaySurface): string {
  switch (surface) {
    case "action":
      return "操作失敗。"
    case "page":
      return "資料載入失敗，請稍後再試。"
    case "crash":
      return "操作失敗。"
  }
}

function operationGuidance(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null
  const guidance = error.details.guidance
  if (typeof guidance !== "string" || !guidance.trim()) return null
  return guidance
}
