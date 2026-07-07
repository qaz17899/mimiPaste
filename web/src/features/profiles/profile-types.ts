export type Profile = {
  id: string
  agent_id: string
  agent_name: string
  name: string
  description: string
  format: "toml" | "json" | "text"
  content: string
  display_content: string
  content_masked: boolean
  created_at: string
  updated_at: string
}

export type ProfileSaveInput = {
  agent_id: string
  name: string
  description: string
  format: "toml" | "json" | "text"
  content: string
  content_masked?: boolean
}

export type ProfileListResponse = {
  profiles: Profile[]
}
