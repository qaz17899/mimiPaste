import { Copy, Star, Trash2 } from "lucide-react"
import type { KeyboardEvent } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { PromptViewMode } from "@/features/prompts/PromptToolbar"
import { formatDate } from "@/features/prompts/prompt-state"
import type { Prompt } from "@/features/prompts/prompt-types"

type Props = {
  prompts: Prompt[]
  selectedID: string | null
  viewMode: PromptViewMode
  loading: boolean
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onSelect: (prompt: Prompt) => void
  onToggleFavorite: (prompt: Prompt) => void
}

export function PromptBrowser(props: Props) {
  if (props.loading) return <PromptSkeleton />
  if (props.prompts.length === 0) return <EmptyPromptBrowser />
  if (props.viewMode === "list") return <PromptTable {...props} />
  return <PromptCards {...props} />
}

function PromptCards({
  prompts,
  selectedID,
  onCopy,
  onDelete,
  onSelect,
  onToggleFavorite,
}: Props) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
      {prompts.map((prompt) => (
        <PromptCardItem
          key={prompt.id}
          prompt={prompt}
          selected={prompt.id === selectedID}
          onCopy={onCopy}
          onDelete={onDelete}
          onSelect={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  )
}

function PromptCardItem({
  prompt,
  selected,
  onCopy,
  onDelete,
  onSelect,
  onToggleFavorite,
}: {
  prompt: Prompt
  selected: boolean
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onSelect: (prompt: Prompt) => void
  onToggleFavorite: (prompt: Prompt) => void
}) {
  return (
    <Card
      size="sm"
      role="button"
      tabIndex={0}
      data-selected={selected}
      className="group min-h-[210px] cursor-pointer overflow-hidden transition-colors outline-none hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[selected=true]:border-primary"
      onClick={() => onSelect(prompt)}
      onKeyDown={(event) => handleSelectKeyDown(event, prompt, onSelect)}
    >
      <PromptCardHeader prompt={prompt} onToggleFavorite={onToggleFavorite} />
      <CardContent className="flex min-h-[92px] flex-col gap-2">
        <p className="line-clamp-4 text-sm leading-6 text-muted-foreground">
          {prompt.description || prompt.content}
        </p>
        <PromptTags prompt={prompt} />
      </CardContent>
      <CardFooter className="mt-auto flex items-end justify-between gap-2 pt-0">
        <span className="min-w-0 truncate text-xs text-muted-foreground">
          {copySummary(prompt.copy_count)}
        </span>
        <PromptRowActions prompt={prompt} onCopy={onCopy} onDelete={onDelete} />
      </CardFooter>
    </Card>
  )
}

function PromptCardHeader({
  prompt,
  onToggleFavorite,
}: {
  prompt: Prompt
  onToggleFavorite: (prompt: Prompt) => void
}) {
  return (
    <CardHeader className="pb-2">
      <CardTitle className="line-clamp-2 min-w-0 leading-5">
        {prompt.title}
      </CardTitle>
      <CardAction>
        <FavoriteButton prompt={prompt} onToggleFavorite={onToggleFavorite} />
      </CardAction>
    </CardHeader>
  )
}

function PromptTable({
  prompts,
  selectedID,
  onCopy,
  onDelete,
  onSelect,
  onToggleFavorite,
}: Props) {
  return (
    <div data-slot="prompt-table-frame" className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>標題</TableHead>
            <TableHead>標籤</TableHead>
            <TableHead>最近更新</TableHead>
            <TableHead>最近複製</TableHead>
            <TableHead className="w-28 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {prompts.map((prompt) => (
            <PromptTableRow
              key={prompt.id}
              prompt={prompt}
              selected={prompt.id === selectedID}
              onCopy={onCopy}
              onDelete={onDelete}
              onSelect={onSelect}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function PromptTableRow({
  prompt,
  selected,
  onCopy,
  onDelete,
  onSelect,
  onToggleFavorite,
}: {
  prompt: Prompt
  selected: boolean
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onSelect: (prompt: Prompt) => void
  onToggleFavorite: (prompt: Prompt) => void
}) {
  return (
    <TableRow
      data-state={selected ? "selected" : undefined}
      tabIndex={0}
      className="cursor-pointer outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      onClick={() => onSelect(prompt)}
      onKeyDown={(event) => handleSelectKeyDown(event, prompt, onSelect)}
    >
      <PromptTitleCell prompt={prompt} />
      <TableCell>
        <PromptTags prompt={prompt} />
      </TableCell>
      <TableCell>{formatDate(prompt.updated_at)}</TableCell>
      <TableCell>{formatDate(prompt.last_copied_at)}</TableCell>
      <TableCell className="text-right">
        <PromptRowActions
          prompt={prompt}
          onCopy={onCopy}
          onDelete={onDelete}
          onToggleFavorite={onToggleFavorite}
        />
      </TableCell>
    </TableRow>
  )
}

function PromptTitleCell({ prompt }: { prompt: Prompt }) {
  return (
    <TableCell className="max-w-80">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate font-medium">{prompt.title}</span>
        <span className="truncate text-xs text-muted-foreground">
          {prompt.description}
        </span>
      </div>
    </TableCell>
  )
}

function FavoriteButton({
  prompt,
  onToggleFavorite,
}: {
  prompt: Prompt
  onToggleFavorite: (prompt: Prompt) => void
}) {
  return (
    <Button
      variant={prompt.favorite ? "secondary" : "ghost"}
      size="icon-sm"
      aria-label={prompt.favorite ? "取消收藏" : "加入收藏"}
      onClick={(event) => {
        event.stopPropagation()
        onToggleFavorite(prompt)
      }}
    >
      <Star data-icon="inline-start" />
    </Button>
  )
}

function PromptRowActions({
  prompt,
  onCopy,
  onDelete,
  onToggleFavorite,
}: {
  prompt: Prompt
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onToggleFavorite?: (prompt: Prompt) => void
}) {
  return (
    <div
      data-slot="prompt-row-actions"
      className="flex shrink-0 justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {onToggleFavorite ? (
        <Button
          variant={prompt.favorite ? "secondary" : "ghost"}
          size="icon-sm"
          aria-label={prompt.favorite ? "取消收藏" : "加入收藏"}
          onClick={() => onToggleFavorite(prompt)}
        >
          <Star data-icon="inline-start" />
        </Button>
      ) : null}
      <Button
        variant="secondary"
        size="icon-sm"
        aria-label="複製提示詞"
        onClick={() => onCopy(prompt)}
      >
        <Copy data-icon="inline-start" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="刪除提示詞"
        onClick={() => onDelete(prompt)}
      >
        <Trash2 data-icon="inline-start" />
      </Button>
    </div>
  )
}

function handleSelectKeyDown(
  event: KeyboardEvent,
  prompt: Prompt,
  onSelect: (prompt: Prompt) => void
) {
  if (event.key !== "Enter" && event.key !== " ") return
  event.preventDefault()
  onSelect(prompt)
}

function copySummary(copyCount: number) {
  return copyCount > 0 ? `${copyCount} 次複製` : "尚未複製"
}

function PromptTags({ prompt }: { prompt: Prompt }) {
  if (prompt.tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {prompt.tags.map((tag) => (
        <Badge key={tag.id || tag.name} variant="secondary">
          {tag.name}
        </Badge>
      ))}
    </div>
  )
}

function EmptyPromptBrowser() {
  return (
    <Empty className="min-h-[420px] rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyTitle>尚無提示詞。</EmptyTitle>
        <EmptyDescription>請新增第一則提示詞。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function PromptSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton key={index} className="min-h-[210px] rounded-lg" />
      ))}
    </div>
  )
}
