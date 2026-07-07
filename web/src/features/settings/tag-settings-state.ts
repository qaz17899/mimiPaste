import type { PromptTag } from "@/features/prompts/prompt-types"

export type TagDraft = {
  color: string
  name: string
}

export const DEFAULT_TAG_COLOR = "#3b82f6"

export function tagDraftFromTag(tag: PromptTag): TagDraft {
  return {
    color: tag.color ?? DEFAULT_TAG_COLOR,
    name: tag.name,
  }
}

export function tagDraftFor(
  tag: PromptTag,
  drafts: Record<string, TagDraft>
): TagDraft {
  return drafts[tag.id] ?? tagDraftFromTag(tag)
}
