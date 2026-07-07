import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { queryKeys } from "@/app/query-client"

import {
  deleteBackup,
  exportBackup,
  fetchBackups,
  pinBackup,
  previewRestore,
  pruneBackups,
  restoreBackup,
} from "@/features/backups/backup-api"

export function useBackups() {
  return useQuery({ queryKey: queryKeys.backups.root(), queryFn: fetchBackups })
}

export function useBackupMutations() {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.backups.root() })
  return {
    delete: useMutation({ mutationFn: deleteBackup, onSuccess: invalidate }),
    export: useMutation({ mutationFn: exportBackup }),
    pin: useMutation({
      mutationFn: ({ id, pinned }: { id: string; pinned: boolean }) =>
        pinBackup(id, pinned),
      onSuccess: invalidate,
    }),
    previewRestore: useMutation({ mutationFn: previewRestore }),
    prune: useMutation({ mutationFn: pruneBackups, onSuccess: invalidate }),
    restore: useMutation({ mutationFn: restoreBackup, onSuccess: invalidate }),
  }
}
