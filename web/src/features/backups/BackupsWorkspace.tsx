import { useState } from "react"
import { Download, Eye, EyeOff, Pin, PinOff, RotateCcw, Trash2 } from "lucide-react"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  useBackupMutations,
  useBackups,
} from "@/features/backups/backup-queries"
import type {
  Backup,
  BackupExport,
  BackupPruneResult,
} from "@/features/backups/backup-types"
import { formatDate } from "@/features/prompts/prompt-state"
import { actionErrorMessage } from "@/lib/errors/display-policy"
import { UserVisibleError } from "@/lib/errors/user-visible-error"

const defaultBackupKeepCount = 10
const emptyBackups: Backup[] = []

export function BackupsWorkspace() {
  const backups = useBackups().data?.backups ?? emptyBackups
  const mutations = useBackupMutations()
  const [selected, setSelected] = useState<Backup | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null)
  const [diff, setDiff] = useState("")
  const [keepCount, setKeepCount] = useState(String(defaultBackupKeepCount))
  const [rawVisible, setRawVisible] = useState(false)
  const selectedBackup = currentBackup(backups, selected)

  if (backups.length === 0) {
    return <EmptyBlock title="尚無備份。" action="請先套用配置。" />
  }

  return (
    <section className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
      <BackupList
        backups={backups}
        keepCount={keepCount}
        pending={mutations.prune.isPending}
        selectedID={selectedBackup?.id ?? null}
        onKeepCountChange={setKeepCount}
        onPrune={() =>
          runAction(
            pruneOldBackups(
              keepCount,
              mutations.prune.mutateAsync,
              clearSelection(setSelected, setDiff)
            )
          )
        }
        onSelect={(backup) => {
          setSelected(backup)
          setDiff("")
          setRawVisible(false)
        }}
      />
      <BackupDetail
        backup={selectedBackup}
        diff={diff}
        pending={backupPending(mutations)}
        rawVisible={rawVisible}
        onDelete={() => setDeleteTarget(selectedBackup)}
        onExport={() =>
          selectedBackup &&
          runAction(exportSelected(selectedBackup, mutations.export.mutateAsync))
        }
        onPin={() =>
          selectedBackup &&
          runAction(pinSelected(selectedBackup, mutations.pin.mutateAsync))
        }
        onPreview={() =>
          selectedBackup &&
          runAction(
            preview(
              selectedBackup.id,
              mutations.previewRestore.mutateAsync,
              setDiff
            )
          )
        }
        onRestore={() => setRestoreTarget(selectedBackup)}
        onRawVisibleChange={setRawVisible}
      />
      <RestoreBackupDialog
        backup={restoreTarget}
        pending={mutations.restore.isPending}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        onConfirm={() =>
          runAction(
            restore(
              restoreTarget,
              mutations.restore.mutateAsync,
              setRestoreTarget
            )
          )
        }
      />
      <DeleteBackupDialog
        backup={deleteTarget}
        pending={mutations.delete.isPending}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() =>
          runAction(
            deleteSelected(
              deleteTarget,
              mutations.delete.mutateAsync,
              setDeleteTarget,
              clearSelection(setSelected, setDiff)
            )
          )
        }
      />
    </section>
  )
}

function BackupList({
  backups,
  keepCount,
  pending,
  selectedID,
  onKeepCountChange,
  onPrune,
  onSelect,
}: {
  backups: Backup[]
  keepCount: string
  pending: boolean
  selectedID: string | null
  onKeepCountChange: (value: string) => void
  onPrune: () => void
  onSelect: (backup: Backup) => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>備份</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {backups.map((backup) => (
          <BackupListItem
            key={backup.id}
            backup={backup}
            selected={selectedID === backup.id}
            onSelect={onSelect}
          />
        ))}
      </CardContent>
      <CardFooter className="flex flex-wrap items-end gap-2">
        <Field className="min-w-32 flex-1">
          <FieldLabel htmlFor="backup-keep-count">保留最近</FieldLabel>
          <Input
            id="backup-keep-count"
            min={0}
            type="number"
            value={keepCount}
            onChange={(event) => onKeepCountChange(event.target.value)}
          />
        </Field>
        <Button variant="outline" disabled={pending} onClick={onPrune}>
          <Trash2 data-icon="inline-start" />
          清理備份
        </Button>
      </CardFooter>
    </Card>
  )
}

function BackupListItem({
  backup,
  selected,
  onSelect,
}: {
  backup: Backup
  selected: boolean
  onSelect: (backup: Backup) => void
}) {
  return (
    <button
      type="button"
      data-slot="backup-list-item"
      data-selected={selected}
      className="flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-left outline-none hover:bg-muted/50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[selected=true]:border-primary"
      onClick={() => onSelect(backup)}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate text-sm font-medium">
          {backup.config_source_name}
        </span>
        {backup.pinned ? <Badge variant="secondary">已釘選</Badge> : null}
      </span>
      <span className="truncate text-xs text-muted-foreground">
        {backup.agent_name} · {formatDate(backup.created_at)}
      </span>
    </button>
  )
}

function BackupDetail({
  backup,
  diff,
  pending,
  rawVisible,
  onDelete,
  onExport,
  onPin,
  onPreview,
  onRawVisibleChange,
  onRestore,
}: {
  backup: Backup | null
  diff: string
  pending: boolean
  rawVisible: boolean
  onDelete: () => void
  onExport: () => void
  onPin: () => void
  onPreview: () => void
  onRawVisibleChange: (visible: boolean) => void
  onRestore: () => void
}) {
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{backup ? backup.config_source_name : "備份內容"}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {backup ? (
          <BackupContent
            backup={backup}
            diff={diff}
            rawVisible={rawVisible}
            onRawVisibleChange={onRawVisibleChange}
          />
        ) : (
          <NoBackup />
        )}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <BackupActions
          backup={backup}
          pending={pending}
          onDelete={onDelete}
          onExport={onExport}
          onPin={onPin}
          onPreview={onPreview}
          onRestore={onRestore}
        />
      </CardFooter>
    </Card>
  )
}

function BackupContent({
  backup,
  diff,
  rawVisible,
  onRawVisibleChange,
}: {
  backup: Backup
  diff: string
  rawVisible: boolean
  onRawVisibleChange: (visible: boolean) => void
}) {
  const content = rawVisible
    ? backup.content
    : backup.display_content || backup.content
  return (
    <>
      {backup.content_masked ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRawVisibleChange(!rawVisible)}
          >
            {rawVisible ? (
              <EyeOff data-icon="inline-start" />
            ) : (
              <Eye data-icon="inline-start" />
            )}
            {rawVisible ? "隱藏敏感內容" : "顯示完整內容"}
          </Button>
        </div>
      ) : null}
      <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
        {content}
      </pre>
      {diff ? (
        <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
          {diff}
        </pre>
      ) : null}
    </>
  )
}

function NoBackup() {
  return (
    <Empty className="min-h-52">
      <EmptyHeader>
        <EmptyTitle>請選擇備份。</EmptyTitle>
        <EmptyDescription>可預覽、匯出或還原。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function BackupActions({
  backup,
  pending,
  onDelete,
  onExport,
  onPin,
  onPreview,
  onRestore,
}: {
  backup: Backup | null
  pending: boolean
  onDelete: () => void
  onExport: () => void
  onPin: () => void
  onPreview: () => void
  onRestore: () => void
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button variant="outline" disabled={!backup || pending} onClick={onPin}>
        {backup?.pinned ? (
          <PinOff data-icon="inline-start" />
        ) : (
          <Pin data-icon="inline-start" />
        )}
        {backup?.pinned ? "取消釘選" : "釘選"}
      </Button>
      <Button variant="outline" disabled={!backup || pending} onClick={onExport}>
        <Download data-icon="inline-start" />
        匯出
      </Button>
      <Button variant="outline" disabled={!backup || pending} onClick={onPreview}>
        <Eye data-icon="inline-start" />
        預覽差異
      </Button>
      <Button disabled={!backup || pending} onClick={onRestore}>
        <RotateCcw data-icon="inline-start" />
        還原備份
      </Button>
      <Button
        variant="destructive"
        disabled={!backup || pending}
        onClick={onDelete}
      >
        <Trash2 data-icon="inline-start" />
        刪除
      </Button>
    </div>
  )
}

function EmptyBlock({ title, action }: { title: string; action: string }) {
  return (
    <Empty className="min-h-52">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{action}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function RestoreBackupDialog({
  backup,
  pending,
  onConfirm,
  onOpenChange,
}: {
  backup: Backup | null
  pending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={backup !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>還原備份？</AlertDialogTitle>
          <AlertDialogDescription>
            這會用備份內容覆寫目前配置。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            variant="destructive"
            onClick={onConfirm}
          >
            還原
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteBackupDialog({
  backup,
  pending,
  onConfirm,
  onOpenChange,
}: {
  backup: Backup | null
  pending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={backup !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除備份？</AlertDialogTitle>
          <AlertDialogDescription>
            {backup ? `「${backup.config_source_name}」會被刪除。` : "備份會被刪除。"}
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

function backupPending(mutations: ReturnType<typeof useBackupMutations>) {
  return (
    mutations.delete.isPending ||
    mutations.export.isPending ||
    mutations.pin.isPending ||
    mutations.previewRestore.isPending ||
    mutations.restore.isPending
  )
}

function currentBackup(backups: Backup[], selected: Backup | null) {
  if (!selected) return null
  return backups.find((backup) => backup.id === selected.id) ?? selected
}

function clearSelection(
  setSelected: (backup: Backup | null) => void,
  setDiff: (diff: string) => void
) {
  return () => {
    setSelected(null)
    setDiff("")
  }
}

async function preview(
  id: string,
  previewRestore: (id: string) => Promise<{ diff: string }>,
  setDiff: (diff: string) => void
) {
  const result = await previewRestore(id)
  setDiff(result.diff)
}

async function pinSelected(
  backup: Backup,
  pinBackup: (input: { id: string; pinned: boolean }) => Promise<Backup>
) {
  await pinBackup({ id: backup.id, pinned: !backup.pinned })
  toast.success(backup.pinned ? "已取消釘選。" : "備份已釘選。")
}

async function exportSelected(
  backup: Backup,
  exportBackup: (id: string) => Promise<BackupExport>
) {
  const result = await exportBackup(backup.id)
  downloadText(result.filename, result.content)
  toast.success("備份已匯出。")
}

async function restore(
  backup: Backup | null,
  restoreBackup: (id: string) => Promise<unknown>,
  setRestoreTarget: (backup: Backup | null) => void
) {
  if (!backup) return
  await restoreBackup(backup.id)
  setRestoreTarget(null)
  toast.success("備份已還原。")
}

async function deleteSelected(
  backup: Backup | null,
  deleteBackup: (id: string) => Promise<unknown>,
  setDeleteTarget: (backup: Backup | null) => void,
  clearCurrentSelection: () => void
) {
  if (!backup) return
  await deleteBackup(backup.id)
  setDeleteTarget(null)
  clearCurrentSelection()
  toast.success("備份已刪除。")
}

async function pruneOldBackups(
  keepText: string,
  pruneBackups: (keep: number) => Promise<BackupPruneResult>,
  clearCurrentSelection: () => void
) {
  const result = await pruneBackups(parseKeepCount(keepText))
  clearCurrentSelection()
  toast.success(`已清理 ${result.deleted.length} 份備份。`)
}

function parseKeepCount(value: string) {
  const keep = Number(value)
  if (!Number.isInteger(keep) || keep < 0) {
    throw new UserVisibleError("保留數量必須是 0 或正整數。")
  }
  return keep
}

function downloadText(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(actionErrorMessage(error))
  })
}
