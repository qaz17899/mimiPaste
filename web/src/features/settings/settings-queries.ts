import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-client"

import { fetchSettings, updateSettings } from "@/features/settings/settings-api"
import type { UpdateSettingsInput } from "@/features/settings/settings-types"

export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.root(),
    queryFn: fetchSettings,
  })
}

export function useSettingsMutations() {
  const queryClient = useQueryClient()
  return {
    update: useMutation({
      mutationFn: (input: UpdateSettingsInput) => updateSettings(input),
      onSuccess: () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.settings.root() }),
    }),
  }
}
