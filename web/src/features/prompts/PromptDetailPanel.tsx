import { Copy, Pencil, Save, Star, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import type { PromptDraft, Prompt } from "@/features/prompts/prompt-types"

export type PromptPanelMode = "empty" | "view" | "create" | "edit"

type Props = {
  mode: PromptPanelMode
  prompt: Prompt | null
  draft: PromptDraft
  dirty: boolean
  pending: boolean
  onCancel: () => void
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onDraftChange: (draft: PromptDraft) => void
  onEdit: () => void
  onSave: () => void
  onToggleFavorite: (prompt: Prompt) => void
}

export function PromptDetailPanel(props: Props) {
  if (props.mode === "create" || props.mode === "edit") {
    return <PromptFormPanel {...props} />
  }
  if (props.mode === "view" && props.prompt) return <PromptViewPanel {...props} />
  return <EmptyDetailPanel />
}

function PromptViewPanel({
  prompt,
  onCopy,
  onDelete,
  onEdit,
  onToggleFavorite,
}: Props) {
  if (!prompt) return null
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <div className="flex items-start gap-3">
          <CardTitle className="min-w-0 flex-1 text-lg">{prompt.title}</CardTitle>
          <Button variant={prompt.favorite ? "secondary" : "outline"} size="icon-sm" onClick={() => onToggleFavorite(prompt)}>
            <Star />
          </Button>
        </div>
        <PromptTags prompt={prompt} />
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        {prompt.description ? <p className="text-sm text-muted-foreground">{prompt.description}</p> : null}
        <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
          {prompt.content}
        </pre>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onCopy(prompt)}>
          <Copy data-icon="inline-start" />
          複製
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          編輯
        </Button>
        <Button variant="destructive" onClick={() => onDelete(prompt)}>
          <Trash2 data-icon="inline-start" />
          刪除
        </Button>
      </CardFooter>
    </Card>
  )
}

function PromptFormPanel({
  mode,
  draft,
  dirty,
  pending,
  onCancel,
  onDraftChange,
  onSave,
}: Props) {
  const title = mode === "create" ? "新增提示詞" : "編輯提示詞"
  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto">
        <form className="flex flex-col gap-5" onSubmit={(event) => event.preventDefault()}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="prompt-title">標題</FieldLabel>
              <Input
                id="prompt-title"
                value={draft.title}
                onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
                autoFocus
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prompt-description">描述</FieldLabel>
              <Input
                id="prompt-description"
                value={draft.description}
                onChange={(event) => onDraftChange({ ...draft, description: event.target.value })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prompt-tags">標籤</FieldLabel>
              <Input
                id="prompt-tags"
                value={draft.tagsText}
                onChange={(event) => onDraftChange({ ...draft, tagsText: event.target.value })}
              />
            </Field>
            <Field orientation="horizontal" className="flex-row items-center gap-2">
              <FieldLabel htmlFor="prompt-favorite">收藏</FieldLabel>
              <Switch
                id="prompt-favorite"
                checked={draft.favorite}
                onCheckedChange={(favorite) => onDraftChange({ ...draft, favorite })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="prompt-content">內容</FieldLabel>
              <Textarea
                id="prompt-content"
                value={draft.content}
                onChange={(event) => onDraftChange({ ...draft, content: event.target.value })}
                className="min-h-72"
              />
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          <X data-icon="inline-start" />
          取消
        </Button>
        <Button type="button" disabled={pending || !dirty} onClick={onSave}>
          <Save data-icon="inline-start" />
          儲存
        </Button>
      </CardFooter>
    </Card>
  )
}

function EmptyDetailPanel() {
  return (
    <Card className="h-full">
      <CardContent className="flex h-full items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>請選擇提示詞。</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>或新增第一則提示詞。</EmptyContent>
        </Empty>
      </CardContent>
    </Card>
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

