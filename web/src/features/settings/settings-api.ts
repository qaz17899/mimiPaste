import { apiRequest, jsonInit } from "@/lib/api/client"

import type {
  Settings,
  UpdateSettingsInput,
} from "@/features/settings/settings-types"

export function fetchSettings() {
  return apiRequest<Settings>("/api/settings")
}

export function updateSettings(input: UpdateSettingsInput) {
  return apiRequest<Settings>("/api/settings", jsonInit("PUT", input))
}
