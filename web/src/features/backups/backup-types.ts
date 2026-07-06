import type { DiffResult } from "@/features/agents/agent-types"

export type Backup = {
  id: string
  config_source_id: string
  config_source_name: string
  agent_name: string
  profile_id?: string
  profile_name?: string
  path: string
  content: string
  created_at: string
}

export type BackupListResponse = {
  backups: Backup[]
}

export type { DiffResult }

