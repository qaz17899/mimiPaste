import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-client"

import { fetchBackups, previewRestore, restoreBackup } from "@/features/backups/backup-api"

export function useBackups() {
  return useQuery({ queryKey: queryKeys.backups.root(), queryFn: fetchBackups })
}

export function useBackupMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.backups.root() })
  return {
    previewRestore: useMutation({ mutationFn: previewRestore }),
    restore: useMutation({ mutationFn: restoreBackup, onSuccess: invalidate }),
  }
}

