import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-client"

import {
  createPrompt,
  createTag,
  deleteTag,
  deletePrompt,
  exportPrompts,
  fetchPromptVersions,
  fetchPrompts,
  fetchTags,
  importPrompts,
  previewImportPrompts,
  recordPromptCopy,
  rollbackPrompt,
  updateTag,
  updatePrompt,
} from "@/features/prompts/prompt-api"
import type {
  PromptImportEnvelope,
  PromptListFilters,
  SavePromptInput,
} from "@/features/prompts/prompt-types"

export function usePrompts(filters: PromptListFilters) {
  return useQuery({
    queryKey: queryKeys.prompts.list(filters),
    queryFn: () => fetchPrompts(filters),
  })
}

export function useTags() {
  return useQuery({
    queryKey: queryKeys.prompts.tags(),
    queryFn: fetchTags,
  })
}

export function usePromptVersions(promptID: string | null) {
  return useQuery({
    enabled: promptID !== null,
    queryKey: queryKeys.prompts.versions(promptID),
    queryFn: () => fetchPromptVersions(promptID ?? ""),
  })
}

export function usePromptMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.prompts.root() })
  return {
    create: useMutation({ mutationFn: createPrompt, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: SavePromptInput }) =>
        updatePrompt(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deletePrompt, onSuccess: invalidate }),
    copy: useMutation({ mutationFn: recordPromptCopy, onSuccess: invalidate }),
    rollback: useMutation({
      mutationFn: ({ id, versionID }: { id: string; versionID: string }) =>
        rollbackPrompt(id, versionID),
      onSuccess: invalidate,
    }),
    importData: useMutation({
      mutationFn: (input: PromptImportEnvelope) => importPrompts(input),
      onSuccess: invalidate,
    }),
    previewImport: useMutation({
      mutationFn: (input: PromptImportEnvelope) => previewImportPrompts(input),
    }),
    exportData: useMutation({ mutationFn: exportPrompts }),
    createTag: useMutation({
      mutationFn: createTag,
      onSuccess: invalidate,
    }),
    updateTag: useMutation({
      mutationFn: ({
        id,
        input,
      }: {
        id: string
        input: { name: string; color?: string | null }
      }) => updateTag(id, input),
      onSuccess: invalidate,
    }),
    deleteTag: useMutation({
      mutationFn: deleteTag,
      onSuccess: invalidate,
    }),
  }
}
