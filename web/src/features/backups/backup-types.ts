import type { DiffResult } from "@/features/agents/agent-types"

export type Backup = {
  id: string
  config_source_id: string
  config_source_name: string
  agent_name: string
  profile_id?: string
  profile_name?: string
  path: string
  format: string
  content_path: string
  content: string
  display_content: string
  content_masked: boolean
  pinned: boolean
  created_at: string
}

export type BackupListResponse = {
  backups: Backup[]
}

export type BackupExport = {
  filename: string
  content: string
}

export type BackupPruneResult = {
  deleted: Backup[]
  kept: number
}

export type { DiffResult }
