import { useState } from "react"
import { Eye, RotateCcw } from "lucide-react"
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"

import {
  useBackupMutations,
  useBackups,
} from "@/features/backups/backup-queries"
import type { Backup } from "@/features/backups/backup-types"
import { formatDate } from "@/features/prompts/prompt-state"

const emptyBackups: Backup[] = []

export function BackupsWorkspace() {
  const backups = useBackups().data?.backups ?? emptyBackups
  const mutations = useBackupMutations()
  const [selected, setSelected] = useState<Backup | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null)
  const [diff, setDiff] = useState("")

  if (backups.length === 0) {
    return <EmptyBlock title="尚無備份。" action="套用設定前會先建立備份。" />
  }

  return (
    <section className="grid min-h-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
      <BackupList
        backups={backups}
        selectedID={selected?.id ?? null}
        onSelect={setSelected}
      />
      <BackupDetail
        backup={selected}
        diff={diff}
        onPreview={() =>
          selected &&
          runAction(
            preview(selected.id, mutations.previewRestore.mutateAsync, setDiff)
          )
        }
        onRestore={() => setRestoreTarget(selected)}
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
    </section>
  )
}

function BackupList({
  backups,
  selectedID,
  onSelect,
}: {
  backups: Backup[]
  selectedID: string | null
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
      <span className="truncate text-sm font-medium">
        {backup.config_source_name}
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
  onPreview,
  onRestore,
}: {
  backup: Backup | null
  diff: string
  onPreview: () => void
  onRestore: () => void
}) {
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{backup ? backup.config_source_name : "備份內容"}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
        {backup ? <BackupContent backup={backup} diff={diff} /> : <NoBackup />}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <BackupActions
          backup={backup}
          onPreview={onPreview}
          onRestore={onRestore}
        />
      </CardFooter>
    </Card>
  )
}

function BackupContent({ backup, diff }: { backup: Backup; diff: string }) {
  return (
    <>
      <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
        {backup.content}
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
        <EmptyDescription>可預覽與還原。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function BackupActions({
  backup,
  onPreview,
  onRestore,
}: {
  backup: Backup | null
  onPreview: () => void
  onRestore: () => void
}) {
  return (
    <>
      <Button variant="outline" disabled={!backup} onClick={onPreview}>
        <Eye data-icon="inline-start" />
        預覽差異
      </Button>
      <Button disabled={!backup} onClick={onRestore}>
        <RotateCcw data-icon="inline-start" />
        還原備份
      </Button>
    </>
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

async function preview(
  id: string,
  previewRestore: (id: string) => Promise<{ diff: string }>,
  setDiff: (diff: string) => void
) {
  const result = await previewRestore(id)
  setDiff(result.diff)
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

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
