export type ApiErrorBody = {
  error?: {
    code?: string
    message?: string
    details?: unknown
  }
}

export class ApiError extends Error {
  readonly code: string
  readonly details: unknown

  constructor(code: string, message: string, details: unknown = null) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.details = details
  }
}

async function parseError(response: Response): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody
    const code = body.error?.code ?? `HTTP_${response.status}`
    const message = body.error?.message ?? response.statusText
    return new ApiError(code, message, body.error?.details ?? null)
  } catch {
    return new ApiError(`HTTP_${response.status}`, response.statusText)
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(path, init)
  if (!response.ok) throw await parseError(response)
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  }
}
