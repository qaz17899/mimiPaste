import { QueryClient } from "@tanstack/react-query"

import { ApiError } from "@/lib/api/client"

const MAX_QUERY_RETRIES = 1
const STALE_TIME_MS = 5_000

export const queryKeys = {
  runtime: {
    health: () => ["runtime", "health"] as const,
  },
  prompts: {
    root: () => ["prompts"] as const,
    list: (filters: unknown) => ["prompts", "list", filters] as const,
    tags: () => ["prompts", "tags"] as const,
    versions: (id: string | null) => ["prompts", "versions", id] as const,
  },
  agents: {
    root: () => ["agents"] as const,
    configSources: () => ["agents", "config-sources"] as const,
    configSourceRead: (id: string | null) =>
      ["agents", "config-source-read", id] as const,
  },
  profiles: {
    root: () => ["profiles"] as const,
    list: (agentID: string) => ["profiles", "list", agentID] as const,
  },
  backups: {
    root: () => ["backups"] as const,
  },
  settings: {
    root: () => ["settings"] as const,
  },
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: shouldRetryQuery,
      throwOnError: (_error, query) => query.state.data === undefined,
    },
  },
})

export function shouldRetryQuery(failureCount: number, error: Error): boolean {
  if (failureCount >= MAX_QUERY_RETRIES) return false
  if (error instanceof ApiError) return error.retryable
  return false
}
