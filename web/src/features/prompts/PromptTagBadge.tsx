import { Badge } from "@/components/ui/badge"
import type { ReactElement } from "react"

import type { PromptTag } from "@/features/prompts/prompt-types"

const DEFAULT_TAG_COLOR = "#3b82f6"

type Props = {
  tag: Pick<PromptTag, "name" | "color">
  active?: boolean
  render?: ReactElement<Record<string, unknown>>
  onClick?: () => void
}

export function PromptTagBadge({ active, render, tag, onClick }: Props) {
  return (
    <Badge
      variant={active ? "default" : "secondary"}
      render={render}
      onClick={onClick}
      className="gap-1.5"
    >
      <span
        data-color={tagColor(tag.color)}
        data-slot="prompt-tag-color"
        className="size-2 rounded-full"
        style={{ backgroundColor: tagColor(tag.color) }}
      />
      {tag.name}
    </Badge>
  )
}

function tagColor(value?: string): string {
  if (value && /^#[0-9a-f]{6}$/i.test(value)) return value
  return DEFAULT_TAG_COLOR
}
