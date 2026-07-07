import { apiRequest, jsonInit } from "@/lib/api/client"

import type {
  Backup,
  BackupExport,
  BackupListResponse,
  BackupPruneResult,
  DiffResult,
} from "@/features/backups/backup-types"

export function fetchBackups() {
  return apiRequest<BackupListResponse>("/api/backups")
}

export function fetchBackup(id: string) {
  return apiRequest<Backup>(`/api/backups/${id}`)
}

export function deleteBackup(id: string) {
  return apiRequest<void>(`/api/backups/${id}`, { method: "DELETE" })
}

export function exportBackup(id: string) {
  return apiRequest<BackupExport>(`/api/backups/${id}/export`)
}

export function pinBackup(id: string, pinned: boolean) {
  return apiRequest<Backup>(
    `/api/backups/${id}/pin`,
    jsonInit("PUT", { pinned })
  )
}

export function pruneBackups(keep: number) {
  return apiRequest<BackupPruneResult>(
    "/api/backups/prune",
    jsonInit("POST", { keep })
  )
}

export function previewRestore(id: string) {
  return apiRequest<DiffResult>(
    `/api/backups/${id}/preview-restore`,
    jsonInit("POST", {})
  )
}

export function restoreBackup(id: string) {
  return apiRequest<unknown>(
    `/api/backups/${id}/restore`,
    jsonInit("POST", { confirm: true })
  )
}
