import { Copy, Star, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

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

function PromptCards({ prompts, selectedID, onCopy, onDelete, onSelect, onToggleFavorite }: Props) {
  return (
    <div className="grid auto-rows-[190px] grid-cols-1 gap-3 xl:grid-cols-2">
      {prompts.map((prompt) => (
        <Card
          key={prompt.id}
          role="button"
          tabIndex={0}
          data-selected={prompt.id === selectedID}
          className={cn("cursor-pointer transition-colors data-[selected=true]:border-primary")}
          onClick={() => onSelect(prompt)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSelect(prompt)
          }}
        >
          <CardHeader className="pb-2">
            <div className="flex items-start gap-2">
              <CardTitle className="line-clamp-2 min-w-0 flex-1 text-base">{prompt.title}</CardTitle>
              <PromptRowActions
                prompt={prompt}
                onCopy={onCopy}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
              />
            </div>
          </CardHeader>
          <CardContent className="flex h-full flex-col gap-3">
            <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">{prompt.description}</p>
            <PromptTags prompt={prompt} />
            <div className="mt-auto text-xs text-muted-foreground">
              {formatDate(prompt.last_copied_at)} · {prompt.copy_count} 次
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function PromptTable({ prompts, selectedID, onCopy, onDelete, onSelect, onToggleFavorite }: Props) {
  return (
    <div className="rounded-lg border">
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
            <TableRow
              key={prompt.id}
              data-state={prompt.id === selectedID ? "selected" : undefined}
              className="cursor-pointer"
              onClick={() => onSelect(prompt)}
            >
              <TableCell className="max-w-80">
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{prompt.title}</span>
                  <span className="truncate text-xs text-muted-foreground">{prompt.description}</span>
                </div>
              </TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
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
  onToggleFavorite: (prompt: Prompt) => void
}) {
  return (
    <div className="flex shrink-0 justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      <Button variant={prompt.favorite ? "secondary" : "ghost"} size="icon-sm" onClick={() => onToggleFavorite(prompt)}>
        <Star />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => onCopy(prompt)}>
        <Copy />
      </Button>
      <Button variant="ghost" size="icon-sm" onClick={() => onDelete(prompt)}>
        <Trash2 />
      </Button>
    </div>
  )
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
    <div className="flex min-h-[420px] items-center justify-center rounded-lg border border-dashed">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>尚無提示詞。</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>請新增第一則提示詞。</EmptyContent>
      </Empty>
    </div>
  )
}

function PromptSkeleton() {
  return (
    <div className="grid auto-rows-[190px] grid-cols-1 gap-3 xl:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-full rounded-lg" />
      ))}
    </div>
  )
}

