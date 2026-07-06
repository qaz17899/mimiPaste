import { apiRequest, jsonInit } from "@/lib/api/client"

import type {
  Agent,
  AgentListResponse,
  ConfigReadResult,
  ConfigSource,
  ConfigSourceListResponse,
  CreateConfigSourceInput,
  DiffResult,
  ValidationResult,
} from "@/features/agents/agent-types"

export function fetchAgents() {
  return apiRequest<AgentListResponse>("/api/agents")
}

export function createAgent(name: string) {
  return apiRequest<Agent>("/api/agents", jsonInit("POST", { name }))
}

export function fetchConfigSources() {
  return apiRequest<ConfigSourceListResponse>("/api/config-sources")
}

export function createConfigSource(input: CreateConfigSourceInput) {
  return apiRequest<ConfigSource>(
    "/api/config-sources",
    jsonInit("POST", input)
  )
}

export function readConfigSource(id: string) {
  return apiRequest<ConfigReadResult>(`/api/config-sources/${id}/read`)
}

export function validateConfigSource(id: string, content: string) {
  return apiRequest<ValidationResult>(
    `/api/config-sources/${id}/validate`,
    jsonInit("POST", { content })
  )
}

export function saveConfigSourceContent(id: string, content: string) {
  return apiRequest<ConfigReadResult>(
    `/api/config-sources/${id}/content`,
    jsonInit("PUT", { content })
  )
}

export function previewConfigSource(id: string, profileID: string) {
  return apiRequest<DiffResult>(
    `/api/config-sources/${id}/preview`,
    jsonInit("POST", { profile_id: profileID })
  )
}

export function applyConfigSource(id: string, profileID: string) {
  return apiRequest<ConfigReadResult>(
    `/api/config-sources/${id}/apply`,
    jsonInit("POST", { profile_id: profileID })
  )
}
