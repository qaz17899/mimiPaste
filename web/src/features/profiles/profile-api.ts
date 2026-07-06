import { apiRequest, jsonInit } from "@/lib/api/client"

import type { Profile, ProfileListResponse, ProfileSaveInput } from "@/features/profiles/profile-types"

export function fetchProfiles(agentID = "") {
  const params = new URLSearchParams()
  if (agentID) params.set("agent_id", agentID)
  return apiRequest<ProfileListResponse>(`/api/profiles?${params.toString()}`)
}

export function createProfile(input: ProfileSaveInput) {
  return apiRequest<Profile>("/api/profiles", jsonInit("POST", input))
}

export function updateProfile(id: string, input: ProfileSaveInput) {
  return apiRequest<Profile>(`/api/profiles/${id}`, jsonInit("PUT", input))
}

export function deleteProfile(id: string) {
  return apiRequest<void>(`/api/profiles/${id}`, { method: "DELETE" })
}

