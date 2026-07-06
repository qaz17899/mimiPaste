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

import type { Prompt } from "@/features/prompts/prompt-types"

type Props = {
  prompt: Prompt | null
  pending: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}

export function PromptDeleteDialog({
  prompt,
  pending,
  onConfirm,
  onOpenChange,
}: Props) {
  return (
    <AlertDialog open={prompt !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>刪除提示詞？</AlertDialogTitle>
          <AlertDialogDescription>
            {prompt
              ? `「${prompt.title}」刪除後不會出現在列表。`
              : "刪除後不會出現在列表。"}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>取消</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            刪除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
