export type Agent = {
  id: string
  name: string
  kind: string
  config_source_count: number
  profile_count: number
  created_at: string
}

export type ConfigSource = {
  id: string
  agent_id: string
  agent_name: string
  name: string
  path: string
  format: "toml" | "json" | "text"
  active_profile_id?: string
  active_profile_name?: string
  created_at: string
  updated_at: string
}

export type ConfigField = {
  key: string
  value: string
  sensitive: boolean
}

export type ConfigReadResult = {
  source: ConfigSource
  content: string
  valid: boolean
  error?: string
  fields: ConfigField[]
}

export type ValidationResult = {
  valid: boolean
  error?: string
  format: string
}

export type DiffResult = {
  diff: string
  changed: boolean
}

export type AgentListResponse = {
  agents: Agent[]
}

export type ConfigSourceListResponse = {
  config_sources: ConfigSource[]
}

export type CreateConfigSourceInput = {
  agent_id: string
  name: string
  path: string
  format: "toml" | "json" | "text"
}

