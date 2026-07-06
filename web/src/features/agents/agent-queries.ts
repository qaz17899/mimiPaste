import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-client"

import {
  applyConfigSource,
  createAgent,
  createConfigSource,
  fetchAgents,
  fetchConfigSources,
  previewConfigSource,
  readConfigSource,
  saveConfigSourceContent,
  validateConfigSource,
} from "@/features/agents/agent-api"
import type { CreateConfigSourceInput } from "@/features/agents/agent-types"

export function useAgents() {
  return useQuery({ queryKey: queryKeys.agents.root(), queryFn: fetchAgents })
}

export function useConfigSources() {
  return useQuery({ queryKey: queryKeys.agents.configSources(), queryFn: fetchConfigSources })
}

export function useConfigSourceRead(id: string | null) {
  return useQuery({
    queryKey: queryKeys.agents.configSourceRead(id),
    queryFn: () => readConfigSource(id ?? ""),
    enabled: id !== null,
  })
}

export function useAgentMutations() {
  const queryClient = useQueryClient()
  const invalidateAgents = () => queryClient.invalidateQueries({ queryKey: queryKeys.agents.root() })
  return {
    createAgent: useMutation({ mutationFn: createAgent, onSuccess: invalidateAgents }),
    createSource: useMutation({
      mutationFn: (input: CreateConfigSourceInput) => createConfigSource(input),
      onSuccess: invalidateAgents,
    }),
    validateSource: useMutation({
      mutationFn: ({ id, content }: { id: string; content: string }) => validateConfigSource(id, content),
    }),
    saveSource: useMutation({
      mutationFn: ({ id, content }: { id: string; content: string }) => saveConfigSourceContent(id, content),
      onSuccess: invalidateAgents,
    }),
    preview: useMutation({
      mutationFn: ({ id, profileID }: { id: string; profileID: string }) => previewConfigSource(id, profileID),
    }),
    apply: useMutation({
      mutationFn: ({ id, profileID }: { id: string; profileID: string }) => applyConfigSource(id, profileID),
      onSuccess: invalidateAgents,
    }),
  }
}

