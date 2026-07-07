import { useState } from "react"
import { Palette, Pencil, Plus, Save, Tag, Trash2, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { PromptTag } from "@/features/prompts/prompt-types"
import {
  DEFAULT_TAG_COLOR,
  tagDraftFromTag,
  tagDraftFor,
  type TagDraft,
} from "@/features/settings/tag-settings-state"
import { cn } from "@/lib/utils"

const tagColorPresets = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#64748b",
  "#ef4444",
]

type TagSettingsPanelProps = {
  color: string
  drafts: Record<string, TagDraft>
  name: string
  tags: PromptTag[]
  onColorChange: (value: string) => void
  onCreate: () => Promise<boolean>
  onDelete: (tag: PromptTag) => void
  onDraftChange: (id: string, draft: TagDraft) => void
  onNameChange: (value: string) => void
  onUpdate: (tag: PromptTag) => Promise<boolean>
}

export function TagSettingsPanel(props: TagSettingsPanelProps) {
  const [creating, setCreating] = useState(false)
  const [editingTagId, setEditingTagId] = useState<string | null>(null)

  const startCreate = () => {
    setEditingTagId(null)
    setCreating(true)
  }

  const cancelCreate = () => {
    props.onNameChange("")
    props.onColorChange(DEFAULT_TAG_COLOR)
    setCreating(false)
  }

  const startEdit = (tag: PromptTag) => {
    props.onDraftChange(tag.id, tagDraftFromTag(tag))
    setCreating(false)
    setEditingTagId(tag.id)
  }

  const cancelEdit = (tag: PromptTag) => {
    props.onDraftChange(tag.id, tagDraftFromTag(tag))
    setEditingTagId(null)
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tag data-icon="inline-start" />
          標籤管理
        </CardTitle>
        <CardDescription>用顏色整理提示詞分類。</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TagToolbar
          creating={creating}
          count={props.tags.length}
          onCreate={startCreate}
        />
        {creating ? (
          <CreateTagEditor {...props} onCancel={cancelCreate} />
        ) : null}
        <TagList
          {...props}
          editingTagId={editingTagId}
          onCancelEdit={cancelEdit}
          onStartEdit={startEdit}
          onStopEdit={() => setEditingTagId(null)}
        />
      </CardContent>
    </Card>
  )
}

function TagToolbar({
  count,
  creating,
  onCreate,
}: {
  count: number
  creating: boolean
  onCreate: () => void
}) {
  return (
    <div
      data-slot="tag-settings-toolbar"
      className="flex items-center justify-between gap-3"
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-sm font-medium">標籤</span>
        <Badge variant="secondary">{count}</Badge>
      </div>
      {!creating ? (
        <Button variant="outline" size="sm" onClick={onCreate}>
          <Plus data-icon="inline-start" />
          新增
        </Button>
      ) : null}
    </div>
  )
}

function CreateTagEditor({
  color,
  name,
  onColorChange,
  onCancel,
  onCreate,
  onNameChange,
}: TagSettingsPanelProps & { onCancel: () => void }) {
  const save = async () => {
    if (await onCreate()) onCancel()
  }

  return (
    <div
      data-slot="tag-create-panel"
      className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end"
    >
      <Field>
        <FieldLabel htmlFor="new-tag-name">標籤名稱</FieldLabel>
        <Input
          id="new-tag-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="例如 逆向分析"
        />
      </Field>
      <ColorField
        idPrefix="new-tag"
        value={color}
        onChange={onColorChange}
      />
      <div className="flex items-center justify-end gap-2 md:pb-px">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X data-icon="inline-start" />
          取消
        </Button>
        <Button size="sm" onClick={save}>
          <Save data-icon="inline-start" />
          儲存
        </Button>
      </div>
    </div>
  )
}

function TagList({
  drafts,
  editingTagId,
  tags,
  onCancelEdit,
  onDelete,
  onDraftChange,
  onStartEdit,
  onStopEdit,
  onUpdate,
}: TagSettingsPanelProps & {
  editingTagId: string | null
  onCancelEdit: (tag: PromptTag) => void
  onStartEdit: (tag: PromptTag) => void
  onStopEdit: () => void
}) {
  if (tags.length === 0) {
    return (
      <Empty className="min-h-32 rounded-lg border bg-muted/10">
        <EmptyHeader>
          <EmptyTitle>還沒有標籤。</EmptyTitle>
          <EmptyDescription>提示詞分類會集中在這裡。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div data-slot="tag-settings-list" className="flex flex-col gap-2">
      {tags.map((tag) => (
        <TagRow
          key={tag.id}
          draft={tagDraftFor(tag, drafts)}
          editing={editingTagId === tag.id}
          tag={tag}
          onCancelEdit={onCancelEdit}
          onDelete={onDelete}
          onDraftChange={onDraftChange}
          onStartEdit={onStartEdit}
          onStopEdit={onStopEdit}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

function TagRow({
  draft,
  editing,
  tag,
  onCancelEdit,
  onDelete,
  onDraftChange,
  onStartEdit,
  onStopEdit,
  onUpdate,
}: {
  draft: TagDraft
  editing: boolean
  tag: PromptTag
  onCancelEdit: (tag: PromptTag) => void
  onDelete: (tag: PromptTag) => void
  onDraftChange: (id: string, draft: TagDraft) => void
  onStartEdit: (tag: PromptTag) => void
  onStopEdit: () => void
  onUpdate: (tag: PromptTag) => Promise<boolean>
}) {
  if (editing) {
    return (
      <TagEditorRow
        draft={draft}
        tag={tag}
        onCancelEdit={onCancelEdit}
        onDraftChange={onDraftChange}
        onStopEdit={onStopEdit}
        onUpdate={onUpdate}
      />
    )
  }

  return (
    <div
      data-slot="tag-settings-row"
      className="flex min-h-12 items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
    >
      <div className="min-w-0">
        <TagPreview color={tag.color ?? DEFAULT_TAG_COLOR} name={tag.name} />
      </div>
      <TagRowActions
        tag={tag}
        onDelete={onDelete}
        onStartEdit={onStartEdit}
      />
    </div>
  )
}

function TagEditorRow({
  draft,
  tag,
  onCancelEdit,
  onDraftChange,
  onStopEdit,
  onUpdate,
}: {
  draft: TagDraft
  tag: PromptTag
  onCancelEdit: (tag: PromptTag) => void
  onDraftChange: (id: string, draft: TagDraft) => void
  onStopEdit: () => void
  onUpdate: (tag: PromptTag) => Promise<boolean>
}) {
  const save = async () => {
    if (await onUpdate(tag)) onStopEdit()
  }

  return (
    <div
      data-slot="tag-settings-editor-row"
      className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end"
    >
      <Field>
        <FieldLabel htmlFor={`tag-name-${tag.id}`}>標籤名稱</FieldLabel>
        <Input
          id={`tag-name-${tag.id}`}
          value={draft.name}
          onChange={(event) =>
            onDraftChange(tag.id, { ...draft, name: event.target.value })
          }
        />
      </Field>
      <ColorField
        idPrefix={`tag-color-${tag.id}`}
        value={draft.color}
        onChange={(color) => onDraftChange(tag.id, { ...draft, color })}
      />
      <div className="flex items-center justify-end gap-2 md:pb-px">
        <Button variant="ghost" size="sm" onClick={() => onCancelEdit(tag)}>
          <X data-icon="inline-start" />
          取消
        </Button>
        <Button size="sm" onClick={save}>
          <Save data-icon="inline-start" />
          儲存
        </Button>
      </div>
    </div>
  )
}

function TagRowActions({
  tag,
  onDelete,
  onStartEdit,
}: {
  tag: PromptTag
  onDelete: (tag: PromptTag) => void
  onStartEdit: (tag: PromptTag) => void
}) {
  return (
    <div
      data-slot="tag-settings-row-actions"
      className="flex shrink-0 items-center gap-1"
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="編輯標籤"
              onClick={() => onStartEdit(tag)}
            />
          }
        >
          <Pencil data-icon="inline-start" />
        </TooltipTrigger>
        <TooltipContent>編輯</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="刪除標籤"
              onClick={() => onDelete(tag)}
            />
          }
        >
          <Trash2 data-icon="inline-start" />
        </TooltipTrigger>
        <TooltipContent>刪除</TooltipContent>
      </Tooltip>
    </div>
  )
}

function ColorField({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel>顏色</FieldLabel>
      <div className="flex flex-wrap items-center gap-2">
        <ColorPresetGroup value={value} onChange={onChange} />
        <CustomColorInput
          id={`${idPrefix}-custom`}
          value={value}
          onChange={onChange}
        />
      </div>
    </Field>
  )
}

function ColorPresetGroup({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <ToggleGroup
      value={tagColorPresets.includes(value) ? [value] : []}
      onValueChange={(values) => {
        const color = values[0]
        if (color) onChange(color)
      }}
      size="sm"
      spacing={1}
      variant="outline"
    >
      {tagColorPresets.map((color) => (
        <ToggleGroupItem
          key={color}
          aria-label={`選擇 ${color}`}
          className="size-7 min-w-7 rounded-full p-0 data-[state=on]:ring-2 data-[state=on]:ring-primary"
          value={color}
        >
          <span
            className="size-4 rounded-full"
            style={{ backgroundColor: color }}
          />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

function CustomColorInput({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  const color = hexColor(value)
  const custom = !tagColorPresets.includes(color.toLowerCase())

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <label
            className={cn(
              "inline-flex size-7 cursor-pointer items-center justify-center rounded-full border bg-background",
              "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
              custom && "border-ring ring-2 ring-ring/50"
            )}
            htmlFor={id}
          />
        }
      >
        <Palette data-icon="inline-start" />
        <input
          id={id}
          aria-label="自訂顏色"
          className="sr-only"
          type="color"
          value={color}
          onChange={(event) => onChange(event.target.value)}
        />
      </TooltipTrigger>
      <TooltipContent>自訂顏色</TooltipContent>
    </Tooltip>
  )
}

function TagPreview({ color, name }: { color: string; name: string }) {
  return (
    <Badge
      variant="secondary"
      className="h-7 max-w-full justify-start gap-2 px-2.5"
    >
      <span
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="truncate">{name.trim() || "未命名標籤"}</span>
    </Badge>
  )
}

function hexColor(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) return value
  return DEFAULT_TAG_COLOR
}
