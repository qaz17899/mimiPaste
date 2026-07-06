import { useState } from "react"
import { Eye, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

import { useBackupMutations, useBackups } from "@/features/backups/backup-queries"
import type { Backup } from "@/features/backups/backup-types"
import { formatDate } from "@/features/prompts/prompt-state"

export function BackupsWorkspace() {
  const backups = useBackups().data?.backups ?? []
  const mutations = useBackupMutations()
  const [selected, setSelected] = useState<Backup | null>(null)
  const [diff, setDiff] = useState("")

  if (backups.length === 0) {
    return <EmptyBlock title="尚無備份。" action="套用設定前會先建立備份。" />
  }

  return (
    <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(380px,520px)] gap-4">
      <Card>
        <CardHeader>
          <CardTitle>備份</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {backups.map((backup) => (
            <button
              key={backup.id}
              data-selected={selected?.id === backup.id}
              className="flex min-w-0 flex-col gap-1 rounded-lg border p-3 text-left hover:bg-muted/50 data-[selected=true]:border-primary"
              onClick={() => setSelected(backup)}
            >
              <span className="truncate text-sm font-medium">{backup.config_source_name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {backup.agent_name} · {formatDate(backup.created_at)}
              </span>
            </button>
          ))}
        </CardContent>
      </Card>
      <Card className="flex min-h-0 flex-col">
        <CardHeader>
          <CardTitle>{selected ? selected.config_source_name : "備份內容"}</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          {selected ? (
            <>
              <pre className="max-h-64 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">
                {selected.content}
              </pre>
              {diff ? <pre className="min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">{diff}</pre> : null}
            </>
          ) : (
            <div className="flex min-h-52 items-center justify-center">
              <Empty>
                <EmptyHeader>
                  <EmptyTitle>請選擇備份。</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>可預覽與還原。</EmptyContent>
              </Empty>
            </div>
          )}
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button
            variant="outline"
            disabled={!selected}
            onClick={() => selected && runAction(preview(selected.id, mutations.previewRestore.mutateAsync, setDiff))}
          >
            <Eye data-icon="inline-start" />
            預覽差異
          </Button>
          <Button
            disabled={!selected}
            onClick={() => selected && runAction(restore(selected.id, mutations.restore.mutateAsync))}
          >
            <RotateCcw data-icon="inline-start" />
            還原備份
          </Button>
        </CardFooter>
      </Card>
    </section>
  )
}

function EmptyBlock({ title, action }: { title: string; action: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-52 items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>{action}</EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}

async function preview(id: string, previewRestore: (id: string) => Promise<{ diff: string }>, setDiff: (diff: string) => void) {
  const result = await previewRestore(id)
  setDiff(result.diff)
}

async function restore(id: string, restoreBackup: (id: string) => Promise<unknown>) {
  if (!window.confirm("還原備份會覆寫目前內容。")) return
  await restoreBackup(id)
  toast.success("備份已還原。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
