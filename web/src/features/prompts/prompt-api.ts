import { apiRequest, jsonInit } from "@/lib/api/client"

import type {
  Prompt,
  PromptImportEnvelope,
  PromptListFilters,
  PromptListResponse,
  SavePromptInput,
  TagListResponse,
} from "@/features/prompts/prompt-types"

export function fetchPrompts(filters: PromptListFilters) {
  return apiRequest<PromptListResponse>(
    `/api/prompts?${promptSearchParams(filters)}`
  )
}

export function createPrompt(input: SavePromptInput) {
  return apiRequest<Prompt>("/api/prompts", jsonInit("POST", input))
}

export function updatePrompt(id: string, input: SavePromptInput) {
  return apiRequest<Prompt>(`/api/prompts/${id}`, jsonInit("PUT", input))
}

export function deletePrompt(id: string) {
  return apiRequest<void>(`/api/prompts/${id}`, { method: "DELETE" })
}

export function recordPromptCopy(id: string) {
  return apiRequest<Prompt>(`/api/prompts/${id}/copy`, jsonInit("POST"))
}

export function fetchTags() {
  return apiRequest<TagListResponse>("/api/tags")
}

export function createTag(input: { name: string; color?: string | null }) {
  return apiRequest("/api/tags", jsonInit("POST", input))
}

export function updateTag(
  id: string,
  input: { name: string; color?: string | null }
) {
  return apiRequest(`/api/tags/${id}`, jsonInit("PUT", input))
}

export function deleteTag(id: string) {
  return apiRequest<void>(`/api/tags/${id}`, { method: "DELETE" })
}

export function exportPrompts() {
  return apiRequest<PromptImportEnvelope>("/api/export/prompts")
}

export function importPrompts(input: PromptImportEnvelope) {
  return apiRequest<{ status: "ok" }>(
    "/api/import/prompts",
    jsonInit("POST", input)
  )
}

function promptSearchParams(filters: PromptListFilters) {
  const params = new URLSearchParams()
  if (filters.query.trim()) params.set("q", filters.query.trim())
  if (filters.tag) params.set("tag", filters.tag)
  if (filters.favoriteOnly) params.set("favorite", "true")
  params.set("sort", filters.sort)
  return params.toString()
}
