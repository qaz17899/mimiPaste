import type { Prompt, PromptDraft, SavePromptInput } from "@/features/prompts/prompt-types"

export const emptyDraft: PromptDraft = {
  title: "",
  description: "",
  content: "",
  tagsText: "",
  favorite: false,
}

export function draftFromPrompt(prompt: Prompt): PromptDraft {
  return {
    title: prompt.title,
    description: prompt.description,
    content: prompt.content,
    tagsText: prompt.tags.map((tag) => tag.name).join(", "),
    favorite: prompt.favorite,
  }
}

export function saveInputFromDraft(draft: PromptDraft): SavePromptInput {
  return {
    title: draft.title,
    description: draft.description,
    content: draft.content,
    tags: parseTags(draft.tagsText),
    favorite: draft.favorite,
  }
}

export function draftsEqual(left: PromptDraft, right: PromptDraft) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function parseTags(value: string) {
  const seen = new Set<string>()
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => {
      const key = tag.toLocaleLowerCase()
      if (!tag || seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function formatDate(value?: string) {
  if (!value) return "尚未複製"
  return new Intl.DateTimeFormat("zh-TW", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value))
}

