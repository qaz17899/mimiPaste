import { useState } from "react"
import { RotateCcw } from "lucide-react"

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
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

import { formatDate } from "@/features/prompts/prompt-state"
import type { Prompt, PromptVersion } from "@/features/prompts/prompt-types"

type Props = {
  loading: boolean
  open: boolean
  pending: boolean
  prompt: Prompt | null
  versions: PromptVersion[]
  onClose: () => void
  onRollback: (version: PromptVersion) => void
}

export function PromptHistoryDialog(props: Props) {
  const [confirmVersion, setConfirmVersion] = useState<PromptVersion | null>(null)
  if (!props.prompt) return null

  return (
    <>
      <Dialog open={props.open} onOpenChange={(open) => !open && props.onClose()}>
        <DialogContent className="max-h-[calc(100svh-2rem)] sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>歷史版本</DialogTitle>
          </DialogHeader>
          <HistoryContent
            loading={props.loading}
            prompt={props.prompt}
            versions={props.versions}
            onRequestRollback={setConfirmVersion}
          />
        </DialogContent>
      </Dialog>
      <RollbackConfirmDialog
        pending={props.pending}
        version={confirmVersion}
        onCancel={() => setConfirmVersion(null)}
        onConfirm={() => {
          if (!confirmVersion) return
          props.onRollback(confirmVersion)
          setConfirmVersion(null)
        }}
      />
    </>
  )
}

function HistoryContent({
  loading,
  prompt,
  versions,
  onRequestRollback,
}: {
  loading: boolean
  prompt: Prompt
  versions: PromptVersion[]
  onRequestRollback: (version: PromptVersion) => void
}) {
  if (loading) return <HistorySkeleton />
  if (versions.length === 0) return <EmptyHistory />
  return (
    <ScrollArea className="max-h-[62svh] pr-3">
      <div className="flex flex-col gap-3">
        {versions.map((version) => (
          <VersionCard
            key={version.id}
            prompt={prompt}
            version={version}
            onRollback={onRequestRollback}
          />
        ))}
      </div>
    </ScrollArea>
  )
}

function VersionCard({
  prompt,
  version,
  onRollback,
}: {
  prompt: Prompt
  version: PromptVersion
  onRollback: (version: PromptVersion) => void
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <Badge variant="secondary">#{version.version}</Badge>
          <span className="truncate">{version.title}</span>
        </CardTitle>
        <CardAction>
          <Button variant="outline" size="sm" onClick={() => onRollback(version)}>
            <RotateCcw data-icon="inline-start" />
            還原
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          {formatDate(version.created_at)}
        </span>
        <pre className="max-h-56 overflow-auto rounded-lg bg-muted/40 p-3 font-mono text-xs whitespace-pre-wrap">
          {buildContentDiff(prompt, version)}
        </pre>
      </CardContent>
    </Card>
  )
}

function RollbackConfirmDialog({
  pending,
  version,
  onCancel,
  onConfirm,
}: {
  pending: boolean
  version: PromptVersion | null
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={version !== null} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>還原歷史版本？</AlertDialogTitle>
          <AlertDialogDescription>
            目前內容會先保存為新的歷史版本，再還原選取版本。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction disabled={pending} onClick={onConfirm}>
            還原
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <Skeleton key={index} className="h-32 rounded-lg" />
      ))}
    </div>
  )
}

function EmptyHistory() {
  return (
    <Empty className="min-h-56 rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyTitle>尚無歷史版本。</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

function buildContentDiff(prompt: Prompt, version: PromptVersion): string {
  if (prompt.content === version.content) return "內容未變更。"
  return [
    "--- 目前內容",
    `+++ 歷史版本 #${version.version}`,
    ...prefixLines("-", prompt.content),
    ...prefixLines("+", version.content),
  ].join("\n")
}

function prefixLines(prefix: string, content: string): string[] {
  return content.split(/\r?\n/).map((line) => `${prefix} ${line}`)
}
