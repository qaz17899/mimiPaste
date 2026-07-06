import { useState } from "react"
import { Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
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
import {
  useSettings,
  useSettingsMutations,
} from "@/features/settings/settings-queries"

export function SettingsWorkspace() {
  const settingsQuery = useSettings()
  const mutation = useSettingsMutations().update
  const tagMutations = usePromptMutations()
  const tags = useTags().data?.tags ?? []
  const settings = settingsQuery.data
  const [backupDraft, setBackupDraft] = useState<string | null>(null)
  const [tagName, setTagName] = useState("")
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({})
  const backupDir = backupDraft ?? settings?.backup_dir ?? ""

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>本機資料</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>資料庫路徑</FieldLabel>
              <Input value={settings?.db_path ?? ""} readOnly />
            </Field>
            <Field>
              <FieldLabel>備份目錄</FieldLabel>
              <Input
                value={backupDir}
                onChange={(event) => setBackupDraft(event.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button
            disabled={mutation.isPending}
            onClick={() =>
              runAction(saveBackupDir(backupDir, mutation.mutateAsync))
            }
          >
            <Save data-icon="inline-start" />
            儲存
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>外觀</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
      <TagSettingsPanel
        drafts={tagDrafts}
        name={tagName}
        tags={tags}
        onCreate={() =>
          runAction(
            createTag(tagName, tagMutations.createTag.mutateAsync, setTagName)
          )
        }
        onDelete={(id) =>
          window.confirm("刪除這個標籤？") &&
          runAction(tagMutations.deleteTag.mutateAsync(id))
        }
        onDraftChange={(id, value) =>
          setTagDrafts({ ...tagDrafts, [id]: value })
        }
        onNameChange={setTagName}
        onUpdate={(tag) =>
          runAction(
            updateTag(
              tag,
              tagDrafts[tag.id] ?? tag.name,
              tagMutations.updateTag.mutateAsync
            )
          )
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>診斷</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <Info label="服務版本" value={settings?.service_version ?? ""} />
          <Info label="資料版本" value={settings?.migration_version ?? ""} />
          <Info label="遷移目錄" value={settings?.migrations_dir ?? ""} />
        </CardContent>
      </Card>
    </section>
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
  onDelete: (id: string) => void
  onDraftChange: (id: string, value: string) => void
  onNameChange: (value: string) => void
  onUpdate: (tag: PromptTag) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>標籤管理</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(event) => onNameChange(event.target.value)}
            placeholder="新增標籤"
          />
          <Button onClick={onCreate}>
            <Plus data-icon="inline-start" />
            新增
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 rounded-lg border p-2"
            >
              <Badge variant="secondary" className="shrink-0">
                {drafts[tag.id] ?? tag.name}
              </Badge>
              <Input
                value={drafts[tag.id] ?? tag.name}
                onChange={(event) => onDraftChange(tag.id, event.target.value)}
              />
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => onUpdate(tag)}
              >
                <Save />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(tag.id)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-sm">{value}</div>
    </div>
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
