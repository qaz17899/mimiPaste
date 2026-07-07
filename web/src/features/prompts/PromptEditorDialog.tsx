import { Copy, History, Pencil, Save, Star, Trash2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

import { parseTags } from "@/features/prompts/prompt-state"
import { PromptTagBadge } from "@/features/prompts/PromptTagBadge"
import type {
  Prompt,
  PromptDraft,
  PromptTag,
} from "@/features/prompts/prompt-types"

export type PromptPanelMode = "empty" | "view" | "create" | "edit"

type Props = {
  dirty: boolean
  draft: PromptDraft
  mode: PromptPanelMode
  open: boolean
  pending: boolean
  prompt: Prompt | null
  tags: PromptTag[]
  onClose: () => void
  onCopy: (prompt: Prompt) => void
  onDelete: (prompt: Prompt) => void
  onDraftChange: (draft: PromptDraft) => void
  onEdit: () => void
  onHistory: (prompt: Prompt) => void
  onOpenChange: (open: boolean) => void
  onSave: () => void
  onToggleFavorite: (prompt: Prompt) => void
}

export function PromptEditorDialog(props: Props) {
  if (props.mode === "empty") return null

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        initialFocus={false}
        className="max-h-[calc(100svh-2rem)] overflow-hidden sm:max-w-3xl"
      >
        {props.mode === "view" && props.prompt ? (
          <PromptViewContent {...props} prompt={props.prompt} />
        ) : (
          <PromptFormContent {...props} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function PromptViewContent({
  prompt,
  onCopy,
  onDelete,
  onEdit,
  onHistory,
  onToggleFavorite,
}: Props & { prompt: Prompt }) {
  return (
    <>
      <DialogHeader>
        <div className="flex min-w-0 items-start gap-3 pr-8">
          <DialogTitle className="min-w-0 flex-1 truncate text-lg">
            {prompt.title}
          </DialogTitle>
          <Button
            variant={prompt.favorite ? "secondary" : "outline"}
            size="icon-sm"
            aria-label={prompt.favorite ? "取消收藏" : "加入收藏"}
            onClick={() => onToggleFavorite(prompt)}
          >
            <Star data-icon="inline-start" />
          </Button>
        </div>
        <PromptTags prompt={prompt} />
      </DialogHeader>
      <div className="flex min-h-0 flex-col gap-4 overflow-hidden">
        {prompt.description ? (
          <p className="text-sm text-muted-foreground">{prompt.description}</p>
        ) : null}
        <pre className="max-h-[52svh] cursor-default overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-sm whitespace-pre-wrap">
          {prompt.content}
        </pre>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={() => onCopy(prompt)}>
          <Copy data-icon="inline-start" />
          複製
        </Button>
        <Button variant="outline" onClick={onEdit}>
          <Pencil data-icon="inline-start" />
          編輯
        </Button>
        <Button variant="outline" onClick={() => onHistory(prompt)}>
          <History data-icon="inline-start" />
          歷史
        </Button>
        <Button variant="destructive" onClick={() => onDelete(prompt)}>
          <Trash2 data-icon="inline-start" />
          刪除
        </Button>
      </DialogFooter>
    </>
  )
}

function PromptFormContent({
  dirty,
  draft,
  mode,
  pending,
  tags,
  onClose,
  onDraftChange,
  onSave,
}: Props) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "create" ? "新增提示詞" : "編輯提示詞"}
        </DialogTitle>
      </DialogHeader>
      <div
        data-slot="prompt-form-scroll"
        className="max-h-[62svh] overflow-x-hidden overflow-y-auto pr-2"
      >
        <FieldGroup>
          <PromptTextFields draft={draft} onDraftChange={onDraftChange} />
          <PromptTagPicker
            draft={draft}
            tags={tags}
            onDraftChange={onDraftChange}
          />
          <PromptFavoriteField draft={draft} onDraftChange={onDraftChange} />
          <PromptContentField draft={draft} onDraftChange={onDraftChange} />
        </FieldGroup>
      </div>
      <PromptFormFooter
        dirty={dirty}
        pending={pending}
        onClose={onClose}
        onSave={onSave}
      />
    </>
  )
}

function PromptTextFields({
  draft,
  onDraftChange,
}: {
  draft: PromptDraft
  onDraftChange: (draft: PromptDraft) => void
}) {
  return (
    <>
      <Field>
        <FieldLabel htmlFor="prompt-title">標題</FieldLabel>
        <Input
          id="prompt-title"
          value={draft.title}
          onChange={(event) =>
            onDraftChange({ ...draft, title: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="prompt-description">描述</FieldLabel>
        <Input
          id="prompt-description"
          value={draft.description}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
        />
      </Field>
    </>
  )
}

function PromptTagPicker({
  draft,
  tags,
  onDraftChange,
}: {
  draft: PromptDraft
  tags: PromptTag[]
  onDraftChange: (draft: PromptDraft) => void
}) {
  if (tags.length === 0) return null
  const selected = selectedTagNames(draft.tagsText)
  return (
    <Field>
      <FieldLabel>標籤</FieldLabel>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const active = selected.has(tag.name.toLocaleLowerCase())
          return (
            <PromptTagBadge
              key={tag.id}
              active={active}
              tag={tag}
              render={<button type="button" aria-pressed={active} />}
              onClick={() => onDraftChange(toggleDraftTag(draft, tag.name))}
            />
          )
        })}
      </div>
    </Field>
  )
}

function PromptFavoriteField({
  draft,
  onDraftChange,
}: {
  draft: PromptDraft
  onDraftChange: (draft: PromptDraft) => void
}) {
  return (
    <Field orientation="horizontal" className="flex-row items-center gap-2">
      <FieldLabel htmlFor="prompt-favorite">收藏</FieldLabel>
      <Switch
        id="prompt-favorite"
        checked={draft.favorite}
        onCheckedChange={(favorite) => onDraftChange({ ...draft, favorite })}
      />
    </Field>
  )
}

function PromptContentField({
  draft,
  onDraftChange,
}: {
  draft: PromptDraft
  onDraftChange: (draft: PromptDraft) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor="prompt-content">內容</FieldLabel>
      <Textarea
        id="prompt-content"
        value={draft.content}
        onChange={(event) =>
          onDraftChange({ ...draft, content: event.target.value })
        }
        spellCheck={false}
        className="min-h-[38svh] font-mono text-sm"
      />
    </Field>
  )
}

function PromptFormFooter({
  dirty,
  pending,
  onClose,
  onSave,
}: {
  dirty: boolean
  pending: boolean
  onClose: () => void
  onSave: () => void
}) {
  return (
    <DialogFooter>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={onClose}
      >
        <X data-icon="inline-start" />
        取消
      </Button>
      <Button type="button" disabled={pending || !dirty} onClick={onSave}>
        <Save data-icon="inline-start" />
        儲存
      </Button>
    </DialogFooter>
  )
}

function selectedTagNames(tagsText: string) {
  return new Set(parseTags(tagsText).map((name) => name.toLocaleLowerCase()))
}

function toggleDraftTag(draft: PromptDraft, tagName: string): PromptDraft {
  const selected = parseTags(draft.tagsText)
  const tagKey = tagName.toLocaleLowerCase()
  const exists = selected.some((name) => name.toLocaleLowerCase() === tagKey)
  const tags = exists
    ? selected.filter((name) => name.toLocaleLowerCase() !== tagKey)
    : [...selected, tagName]
  return { ...draft, tagsText: tags.join(", ") }
}

function PromptTags({ prompt }: { prompt: Prompt }) {
  if (prompt.tags.length === 0) return null
  return (
    <div data-slot="prompt-tags" className="flex flex-wrap gap-1">
      {prompt.tags.map((tag) => (
        <PromptTagBadge key={tag.id || tag.name} tag={tag} />
      ))}
    </div>
  )
}
