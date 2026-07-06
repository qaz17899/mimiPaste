import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

import { usePromptMutations, useTags } from "@/features/prompts/prompt-queries"
import type { PromptTag } from "@/features/prompts/prompt-types"
import {
  useSettings,
  useSettingsMutations,
} from "@/features/settings/settings-queries"

type SettingsWorkspaceModel = {
  backupDir: string
  dbPath: string
  deletingTag: PromptTag | null
  drafts: Record<string, string>
  migrationVersion: string
  pendingBackup: boolean
  pendingDeleteTag: boolean
  serviceVersion: string
  tagName: string
  tags: PromptTag[]
  migrationsDir: string
}

type SettingsWorkspaceActions = {
  changeBackupDir: (value: string) => void
  changeTagDraft: (id: string, value: string) => void
  changeTagName: (value: string) => void
  confirmDeleteTag: () => void
  createTag: () => void
  deleteTag: (tag: PromptTag) => void
  saveBackupDir: () => void
  setDeletingTag: (tag: PromptTag | null) => void
  updateTag: (tag: PromptTag) => void
}

type SettingsWorkspaceController = {
  actions: SettingsWorkspaceActions
  model: SettingsWorkspaceModel
}

type SettingsWorkspaceDeps = {
  backupDir: string
  deletingTag: PromptTag | null
  mutation: ReturnType<typeof useSettingsMutations>["update"]
  settings: ReturnType<typeof useSettings>["data"]
  tagDrafts: Record<string, string>
  tagMutations: ReturnType<typeof usePromptMutations>
  tagName: string
  tags: PromptTag[]
  setBackupDraft: (value: string) => void
  setDeletingTag: (tag: PromptTag | null) => void
  setTagDrafts: Dispatch<SetStateAction<Record<string, string>>>
  setTagName: (value: string) => void
}

export function SettingsWorkspace() {
  return <SettingsWorkspaceView {...useSettingsWorkspace()} />
}

function SettingsWorkspaceView({
  actions,
  model,
}: SettingsWorkspaceController) {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <LocalDataCard
        backupDir={model.backupDir}
        dbPath={model.dbPath}
        pending={model.pendingBackup}
        onBackupDirChange={actions.changeBackupDir}
        onSave={actions.saveBackupDir}
      />
      <AppearanceCard />
      <TagSettingsPanel
        drafts={model.drafts}
        name={model.tagName}
        tags={model.tags}
        onCreate={actions.createTag}
        onDelete={actions.deleteTag}
        onDraftChange={actions.changeTagDraft}
        onNameChange={actions.changeTagName}
        onUpdate={actions.updateTag}
      />
      <DeleteTagDialog
        pending={model.pendingDeleteTag}
        tag={model.deletingTag}
        onOpenChange={(open) => !open && actions.setDeletingTag(null)}
        onConfirm={actions.confirmDeleteTag}
      />
      <DiagnosticsCard
        migrationVersion={model.migrationVersion}
        migrationsDir={model.migrationsDir}
        serviceVersion={model.serviceVersion}
      />
    </section>
  )
}

function useSettingsWorkspace(): SettingsWorkspaceController {
  const settingsQuery = useSettings()
  const mutation = useSettingsMutations().update
  const tagMutations = usePromptMutations()
  const tags = useTags().data?.tags ?? []
  const settings = settingsQuery.data
  const [backupDraft, setBackupDraft] = useState<string | null>(null)
  const [tagName, setTagName] = useState("")
  const [deletingTag, setDeletingTag] = useState<PromptTag | null>(null)
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})
  const backupDir = backupDraft ?? settings?.backup_dir ?? ""
  const deps = {
    backupDir,
    deletingTag,
    mutation,
    settings,
    tagDrafts,
    tagMutations,
    tagName,
    tags,
    setBackupDraft,
    setDeletingTag,
    setTagDrafts,
    setTagName,
  }

  return {
    actions: settingsActions(deps),
    model: settingsModel(deps),
  }
}

function settingsActions({
  backupDir,
  deletingTag,
  mutation,
  tagDrafts,
  tagMutations,
  tagName,
  setBackupDraft,
  setDeletingTag,
  setTagDrafts,
  setTagName,
}: SettingsWorkspaceDeps): SettingsWorkspaceActions {
  return {
    changeBackupDir: setBackupDraft,
    changeTagDraft: (id, value) =>
      setTagDrafts((drafts) => ({ ...drafts, [id]: value })),
    changeTagName: setTagName,
    confirmDeleteTag: () =>
      runAction(
        deleteTag(
          deletingTag,
          tagMutations.deleteTag.mutateAsync,
          setDeletingTag
        )
      ),
    createTag: () =>
      runAction(
        createTag(tagName, tagMutations.createTag.mutateAsync, setTagName)
      ),
    deleteTag: setDeletingTag,
    saveBackupDir: () =>
      runAction(saveBackupDir(backupDir, mutation.mutateAsync)),
    setDeletingTag,
    updateTag: (tag) =>
      runAction(
        updateTag(
          tag,
          tagDrafts[tag.id] ?? tag.name,
          tagMutations.updateTag.mutateAsync
        )
      ),
  }
}

function settingsModel({
  backupDir,
  deletingTag,
  mutation,
  settings,
  tagDrafts,
  tagMutations,
  tagName,
  tags,
}: SettingsWorkspaceDeps): SettingsWorkspaceModel {
  return {
    backupDir,
    dbPath: settings?.db_path ?? "",
    deletingTag,
    drafts: tagDrafts,
    migrationVersion: settings?.migration_version ?? "",
    migrationsDir: settings?.migrations_dir ?? "",
    pendingBackup: mutation.isPending,
    pendingDeleteTag: tagMutations.deleteTag.isPending,
    serviceVersion: settings?.service_version ?? "",
    tagName,
    tags,
  }
}

function LocalDataCard({
  backupDir,
  dbPath,
  pending,
  onBackupDirChange,
  onSave,
}: {
  backupDir: string
  dbPath: string
  pending: boolean
  onBackupDirChange: (value: string) => void
  onSave: () => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>本機資料</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="settings-db-path">資料庫路徑</FieldLabel>
            <Input id="settings-db-path" value={dbPath} readOnly />
          </Field>
          <Field>
            <FieldLabel htmlFor="settings-backup-dir">備份目錄</FieldLabel>
            <Input
              id="settings-backup-dir"
              value={backupDir}
              onChange={(event) => onBackupDirChange(event.target.value)}
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button disabled={pending} onClick={onSave}>
          <Save data-icon="inline-start" />
          儲存
        </Button>
      </CardFooter>
    </Card>
  )
}

function AppearanceCard() {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>外觀</CardTitle>
      </CardHeader>
      <CardContent>
        <ThemeToggle />
      </CardContent>
    </Card>
  )
}

function TagSettingsPanel({
  drafts,
  name,
  tags,
  onCreate,
  onDelete,
  onDraftChange,
  onNameChange,
  onUpdate,
}: {
  drafts: Record<string, string>
  name: string
  tags: PromptTag[]
  onCreate: () => void
  onDelete: (tag: PromptTag) => void
  onDraftChange: (id: string, value: string) => void
  onNameChange: (value: string) => void
  onUpdate: (tag: PromptTag) => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>標籤管理</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <CreateTagField
          name={name}
          onChange={onNameChange}
          onCreate={onCreate}
        />
        <TagList
          drafts={drafts}
          tags={tags}
          onDelete={onDelete}
          onDraftChange={onDraftChange}
          onUpdate={onUpdate}
        />
      </CardContent>
    </Card>
  )
}

function CreateTagField({
  name,
  onChange,
  onCreate,
}: {
  name: string
  onChange: (value: string) => void
  onCreate: () => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor="new-tag-name" className="sr-only">
        新增標籤
      </FieldLabel>
      <InputGroup>
        <InputGroupInput
          id="new-tag-name"
          value={name}
          onChange={(event) => onChange(event.target.value)}
          placeholder="新增標籤"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton onClick={onCreate}>
            <Plus data-icon="inline-start" />
            新增
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </Field>
  )
}

function TagList({
  drafts,
  tags,
  onDelete,
  onDraftChange,
  onUpdate,
}: {
  drafts: Record<string, string>
  tags: PromptTag[]
  onDelete: (tag: PromptTag) => void
  onDraftChange: (id: string, value: string) => void
  onUpdate: (tag: PromptTag) => void
}) {
  if (tags.length === 0) {
    return (
      <Empty className="min-h-40">
        <EmptyHeader>
          <EmptyTitle>尚無標籤。</EmptyTitle>
          <EmptyDescription>新增標籤後，可在提示詞中套用。</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div data-slot="tag-settings-list" className="flex flex-col gap-2">
      {tags.map((tag) => (
        <TagRow
          key={tag.id}
          draftName={drafts[tag.id] ?? tag.name}
          tag={tag}
          onDelete={onDelete}
          onDraftChange={onDraftChange}
          onUpdate={onUpdate}
        />
      ))}
    </div>
  )
}

function TagRow({
  draftName,
  tag,
  onDelete,
  onDraftChange,
  onUpdate,
}: {
  draftName: string
  tag: PromptTag
  onDelete: (tag: PromptTag) => void
  onDraftChange: (id: string, value: string) => void
  onUpdate: (tag: PromptTag) => void
}) {
  return (
    <div
      data-slot="tag-settings-row"
      className="flex items-center gap-2 rounded-lg border p-2"
    >
      <Badge variant="secondary" className="shrink-0">
        {draftName}
      </Badge>
      <Field className="min-w-0 flex-1">
        <FieldLabel htmlFor={`tag-name-${tag.id}`} className="sr-only">
          標籤名稱
        </FieldLabel>
        <Input
          id={`tag-name-${tag.id}`}
          value={draftName}
          onChange={(event) => onDraftChange(tag.id, event.target.value)}
        />
      </Field>
      <Button
        variant="outline"
        size="icon-sm"
        aria-label="儲存標籤"
        onClick={() => onUpdate(tag)}
      >
        <Save data-icon="inline-start" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="刪除標籤"
        onClick={() => onDelete(tag)}
      >
        <Trash2 data-icon="inline-start" />
      </Button>
    </div>
  )
}

function DeleteTagDialog({
  pending,
  tag,
  onConfirm,
  onOpenChange,
}: {
  pending: boolean
  tag: PromptTag | null
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={tag !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除標籤？</AlertDialogTitle>
          <AlertDialogDescription>
            {tag ? `「${tag.name}」會從標籤列表移除。` : "標籤會被移除。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant="destructive"
            onClick={onConfirm}
          >
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div data-slot="settings-info" className="min-w-0 rounded-lg border p-3">
      <div
        data-slot="settings-info-label"
        className="text-xs text-muted-foreground"
      >
        {label}
      </div>
      <div
        data-slot="settings-info-value"
        className="truncate font-mono text-sm"
      >
        {value}
      </div>
    </div>
  )
}

function DiagnosticsCard({
  migrationVersion,
  migrationsDir,
  serviceVersion,
}: {
  migrationVersion: string
  migrationsDir: string
  serviceVersion: string
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>診斷</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
        <Info label="服務版本" value={serviceVersion} />
        <Info label="資料版本" value={migrationVersion} />
        <Info label="遷移目錄" value={migrationsDir} />
      </CardContent>
    </Card>
  )
}

async function saveBackupDir(
  backupDir: string,
  save: (input: { backup_dir: string }) => Promise<unknown>
) {
  await save({ backup_dir: backupDir })
  toast.success("設定已儲存。")
}

async function createTag(
  name: string,
  create: (input: { name: string; color?: string | null }) => Promise<unknown>,
  setName: (name: string) => void
) {
  await create({ name })
  setName("")
  toast.success("標籤已新增。")
}

async function deleteTag(
  tag: PromptTag | null,
  remove: (id: string) => Promise<unknown>,
  setDeletingTag: (tag: PromptTag | null) => void
) {
  if (!tag) return
  await remove(tag.id)
  setDeletingTag(null)
  toast.success("標籤已刪除。")
}

async function updateTag(
  tag: PromptTag,
  name: string,
  update: (input: {
    id: string
    input: { name: string; color?: string | null }
  }) => Promise<unknown>
) {
  await update({ id: tag.id, input: { name, color: tag.color ?? null } })
  toast.success("標籤已更新。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
