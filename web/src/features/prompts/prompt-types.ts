export type PromptTag = {
  id: string
  name: string
  color?: string
}

export type Prompt = {
  id: string
  title: string
  content: string
  description: string
  tags: PromptTag[]
  favorite: boolean
  created_at: string
  updated_at: string
  last_copied_at?: string
  copy_count: number
}

export type PromptDraft = {
  title: string
  description: string
  content: string
  tagsText: string
  favorite: boolean
}

export type PromptSort = "updated" | "copied" | "copy_count" | "title"

export type PromptListFilters = {
  query: string
  tag: string
  favoriteOnly: boolean
  sort: PromptSort
}

export type SavePromptInput = {
  title: string
  description: string
  content: string
  tags: string[]
  favorite: boolean
}

export type PromptListResponse = {
  prompts: Prompt[]
}

export type TagListResponse = {
  tags: PromptTag[]
}

export type PromptImportEnvelope = {
  prompts: Array<{
    id?: string
    title: string
    description?: string
    content: string
    tags?: string[]
    favorite?: boolean
  }>
}
