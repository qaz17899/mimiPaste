import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import { Save } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

import { usePromptMutations, useTags } from "@/features/prompts/prompt-queries"
import type { PromptTag } from "@/features/prompts/prompt-types"
import { TagSettingsPanel } from "@/features/settings/TagSettingsPanel"
import {
  DEFAULT_TAG_COLOR,
  tagDraftFor,
  type TagDraft,
} from "@/features/settings/tag-settings-state"
import {
  useSettings,
  useSettingsMutations,
} from "@/features/settings/settings-queries"
import { actionErrorMessage } from "@/lib/errors/display-policy"

type SettingsWorkspaceModel = {
  backupDir: string
  dbPath: string
  deletingTag: PromptTag | null
  drafts: Record<string, TagDraft>
  migrationVersion: string
  pendingBackup: boolean
  pendingDeleteTag: boolean
  serviceVersion: string
  tagColor: string
  tagName: string
  tags: PromptTag[]
  migrationsDir: string
}

type SettingsWorkspaceActions = {
  changeBackupDir: (value: string) => void
  changeTagColor: (value: string) => void
  changeTagDraft: (id: string, value: TagDraft) => void
  changeTagName: (value: string) => void
  confirmDeleteTag: () => void
  createTag: () => Promise<boolean>
  deleteTag: (tag: PromptTag) => void
  saveBackupDir: () => void
  setDeletingTag: (tag: PromptTag | null) => void
  updateTag: (tag: PromptTag) => Promise<boolean>
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
  tagColor: string
  tagDrafts: Record<string, TagDraft>
  tagMutations: ReturnType<typeof usePromptMutations>
  tagName: string
  tags: PromptTag[]
  setBackupDraft: (value: string) => void
  setDeletingTag: (tag: PromptTag | null) => void
  setTagColor: (value: string) => void
  setTagDrafts: Dispatch<SetStateAction<Record<string, TagDraft>>>
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
        color={model.tagColor}
        drafts={model.drafts}
        name={model.tagName}
        tags={model.tags}
        onColorChange={actions.changeTagColor}
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
  const [tagColor, setTagColor] = useState(DEFAULT_TAG_COLOR)
  const [deletingTag, setDeletingTag] = useState<PromptTag | null>(null)
  const [tagDrafts, setTagDrafts] = useState<Record<string, TagDraft>>({})
  const backupDir = backupDraft ?? settings?.backup_dir ?? ""
  const deps = {
    backupDir,
    deletingTag,
    mutation,
    settings,
    tagColor,
    tagDrafts,
    tagMutations,
    tagName,
    tags,
    setBackupDraft,
    setDeletingTag,
    setTagColor,
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
  tagColor,
  tagMutations,
  tagName,
  setBackupDraft,
  setDeletingTag,
  setTagColor,
  setTagDrafts,
  setTagName,
}: SettingsWorkspaceDeps): SettingsWorkspaceActions {
  return {
    changeBackupDir: setBackupDraft,
    changeTagDraft: (id, value) =>
      setTagDrafts((drafts) => ({ ...drafts, [id]: value })),
    changeTagColor: setTagColor,
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
        createTag(
          tagName,
          tagColor,
          tagMutations.createTag.mutateAsync,
          setTagName,
          setTagColor
        )
      ),
    deleteTag: setDeletingTag,
    saveBackupDir: () =>
      runAction(saveBackupDir(backupDir, mutation.mutateAsync)),
    setDeletingTag,
    updateTag: (tag) =>
      runAction(
        updateTag(
          tag,
          tagDraftFor(tag, tagDrafts),
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
  tagColor,
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
    tagColor,
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
        <Info label="資料更新目錄" value={migrationsDir} />
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
  color: string,
  create: (input: { name: string; color?: string | null }) => Promise<unknown>,
  setName: (name: string) => void,
  setColor: (color: string) => void
) {
  await create({ name, color })
  setName("")
  setColor(DEFAULT_TAG_COLOR)
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
  draft: TagDraft,
  update: (input: {
    id: string
    input: { name: string; color?: string | null }
  }) => Promise<unknown>
) {
  await update({
    id: tag.id,
    input: { name: draft.name, color: draft.color },
  })
  toast.success("標籤已更新。")
}

async function runAction(action: Promise<unknown>) {
  try {
    await action
    return true
  } catch (error: unknown) {
    toast.error(actionErrorMessage(error))
    return false
  }
}
