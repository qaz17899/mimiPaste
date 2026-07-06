import { QueryClient } from "@tanstack/react-query"

export const queryKeys = {
  runtime: {
    health: () => ["runtime", "health"] as const,
  },
  prompts: {
    root: () => ["prompts"] as const,
    list: (filters: unknown) => ["prompts", "list", filters] as const,
    tags: () => ["prompts", "tags"] as const,
  },
  agents: {
    root: () => ["agents"] as const,
    configSources: () => ["agents", "config-sources"] as const,
    configSourceRead: (id: string | null) => ["agents", "config-source-read", id] as const,
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
      staleTime: 5_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
