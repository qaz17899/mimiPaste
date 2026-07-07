import { AlertCircle, Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type {
  PromptImportAction,
  PromptImportPreview,
  PromptImportPreviewItem,
} from "@/features/prompts/prompt-types"

type Props = {
  error: string
  open: boolean
  pending: boolean
  preview: PromptImportPreview | null
  onCancel: () => void
  onConfirm: () => void
}

export function PromptImportDialog(props: Props) {
  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent className="max-h-[calc(100svh-2rem)] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>匯入預覽</DialogTitle>
        </DialogHeader>
        <ImportPreviewContent error={props.error} preview={props.preview} />
        <DialogFooter>
          <Button variant="outline" disabled={props.pending} onClick={props.onCancel}>
            取消
          </Button>
          <Button
            disabled={props.pending || !canConfirmImport(props.preview)}
            onClick={props.onConfirm}
          >
            <Check data-icon="inline-start" />
            確認匯入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportPreviewContent({
  error,
  preview,
}: {
  error: string
  preview: PromptImportPreview | null
}) {
  if (error) return <ImportError message={error} />
  if (!preview) return <EmptyImport />
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <ImportCounts preview={preview} />
      <ImportItemsTable items={preview.items} />
    </div>
  )
}

function ImportCounts({ preview }: { preview: PromptImportPreview }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">新增 {preview.added}</Badge>
      <Badge variant="secondary">更新 {preview.updated}</Badge>
      <Badge variant="outline">略過 {preview.skipped}</Badge>
      <Badge variant={preview.invalid > 0 ? "destructive" : "secondary"}>
        有錯誤 {preview.invalid}
      </Badge>
    </div>
  )
}

function ImportItemsTable({ items }: { items: PromptImportPreviewItem[] }) {
  return (
    <div className="max-h-[52svh] overflow-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>項目</TableHead>
            <TableHead>結果</TableHead>
            <TableHead>說明</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <ImportItemRow key={`${item.index}-${item.id}`} item={item} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function ImportItemRow({ item }: { item: PromptImportPreviewItem }) {
  return (
    <TableRow>
      <TableCell>{item.title || item.id || `第 ${item.index + 1} 筆`}</TableCell>
      <TableCell>
        <Badge variant={item.action === "invalid" ? "destructive" : "secondary"}>
          {actionLabel(item.action)}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {item.error || "可以匯入。"}
      </TableCell>
    </TableRow>
  )
}

function ImportError({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
      <AlertCircle data-icon="inline-start" />
      {message}
    </div>
  )
}

function EmptyImport() {
  return (
    <Empty className="min-h-48 rounded-lg border border-dashed">
      <EmptyHeader>
        <EmptyTitle>尚無匯入內容。</EmptyTitle>
        <EmptyDescription>請選擇 JSON 檔案。</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function canConfirmImport(preview: PromptImportPreview | null): boolean {
  if (!preview || preview.invalid > 0) return false
  return preview.added + preview.updated > 0
}

function actionLabel(action: PromptImportAction): string {
  switch (action) {
    case "added":
      return "新增"
    case "updated":
      return "更新"
    case "skipped":
      return "略過"
    default:
      return "有錯誤"
  }
}
