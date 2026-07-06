import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-client"

import {
  createProfile,
  deleteProfile,
  fetchProfiles,
  updateProfile,
} from "@/features/profiles/profile-api"
import type { ProfileSaveInput } from "@/features/profiles/profile-types"

export function useProfiles(agentID = "") {
  return useQuery({
    queryKey: queryKeys.profiles.list(agentID),
    queryFn: () => fetchProfiles(agentID),
  })
}

export function useProfileMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles.root() })
  return {
    create: useMutation({ mutationFn: createProfile, onSuccess: invalidate }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: ProfileSaveInput }) =>
        updateProfile(id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteProfile, onSuccess: invalidate }),
  }
}
