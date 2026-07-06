import { apiRequest, jsonInit } from "@/lib/api/client"

import type { Backup, BackupListResponse, DiffResult } from "@/features/backups/backup-types"

export function fetchBackups() {
  return apiRequest<BackupListResponse>("/api/backups")
}

export function fetchBackup(id: string) {
  return apiRequest<Backup>(`/api/backups/${id}`)
}

export function previewRestore(id: string) {
  return apiRequest<DiffResult>(`/api/backups/${id}/preview-restore`, jsonInit("POST", {}))
}

export function restoreBackup(id: string) {
  return apiRequest<unknown>(`/api/backups/${id}/restore`, jsonInit("POST", { confirm: true }))
}

