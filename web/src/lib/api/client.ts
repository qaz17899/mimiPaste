import { UserVisibleError } from "@/lib/errors/user-visible-error"

export type ProblemDetails = {
  type: string
  title: string
  status: number
  detail: string
  instance: string
  code: string
  requestId: string
  retryable: boolean
  details: Record<string, unknown>
}

const NO_CONTENT_STATUS = 204
const NETWORK_ERROR_STATUS = 0
const PROBLEM_CONTENT_TYPE = "application/problem+json"
const PROBLEM_TYPE_BASE = "https://mimipaste.local/problems/"

type ApiErrorOptions = {
  cause?: unknown
}

export class ApiError extends Error {
  readonly code: string
  readonly details: Record<string, unknown>
  readonly detail: string
  readonly instance: string
  readonly requestId: string
  readonly retryable: boolean
  readonly status: number
  readonly title: string
  readonly type: string

  constructor(problem: ProblemDetails, options: ApiErrorOptions = {}) {
    super(problem.detail, { cause: options.cause })
    this.name = "ApiError"
    this.code = problem.code
    this.detail = problem.detail
    this.details = problem.details
    this.instance = problem.instance
    this.requestId = problem.requestId
    this.retryable = problem.retryable
    this.status = problem.status
    this.title = problem.title
    this.type = problem.type
  }
}

async function parseProblem(response: Response): Promise<ApiError> {
  if (!isProblemResponse(response)) {
    return invalidProblemResponse(response)
  }
  try {
    return new ApiError(problemFromUnknown(await response.json()))
  } catch (error) {
    return invalidProblemResponse(response, error)
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetchResponse(path, init)
  if (!response.ok) throw await parseProblem(response)
  if (response.status === NO_CONTENT_STATUS) return undefined as T
  return (await response.json()) as T
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}

export function userErrorMessage(
  error: unknown,
  fallback = "操作失敗。"
): string {
  if (error instanceof ApiError && error.detail.trim()) return error.detail
  if (error instanceof UserVisibleError && error.detail.trim())
    return error.detail
  return fallback
}

export function errorRequestID(error: unknown): string | null {
  if (error instanceof ApiError && error.requestId.trim())
    return error.requestId
  return null
}

function invalidProblemResponse(response: Response, cause?: unknown): ApiError {
  return new ApiError(
    {
      type: PROBLEM_TYPE_BASE + "invalid-problem-response",
      title: "Invalid problem response",
      status: response.status,
      detail: "伺服器回傳無法辨識的錯誤格式。",
      instance: "",
      code: "INVALID_PROBLEM_RESPONSE",
      requestId: response.headers.get("X-Request-Id") ?? "",
      retryable: false,
      details: {},
    },
    { cause }
  )
}

function problemFromUnknown(value: unknown): ProblemDetails {
  if (!isRecord(value)) throw new Error("problem body is not an object")
  return {
    type: requiredString(value.type, "type"),
    title: requiredString(value.title, "title"),
    status: requiredNumber(value.status, "status"),
    detail: requiredString(value.detail, "detail"),
    instance: requiredString(value.instance, "instance"),
    code: requiredString(value.code, "code"),
    requestId: requiredString(value.requestId, "requestId"),
    retryable: requiredBoolean(value.retryable, "retryable"),
    details: requiredRecord(value.details, "details"),
  }
}

async function fetchResponse(
  path: string,
  init?: RequestInit
): Promise<Response> {
  try {
    return await fetch(path, init)
  } catch (error) {
    throw new ApiError(
      {
        type: PROBLEM_TYPE_BASE + "network-error",
        title: "Network error",
        status: NETWORK_ERROR_STATUS,
        detail: "無法連線到本機服務，請確認服務仍在執行。",
        instance: "",
        code: "NETWORK_ERROR",
        requestId: "",
        retryable: true,
        details: {},
      },
      { cause: error }
    )
  }
}

function isProblemResponse(response: Response): boolean {
  return (
    response.headers.get("Content-Type")?.includes(PROBLEM_CONTENT_TYPE) ??
    false
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requiredBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`${field} is not a boolean`)
  return value
}

function requiredNumber(value: unknown, field: string): number {
  if (typeof value !== "number") throw new Error(`${field} is not a number`)
  return value
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`${field} is not a string`)
  return value
}

function requiredRecord(
  value: unknown,
  field: string
): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${field} is not an object`)
  return value
}
