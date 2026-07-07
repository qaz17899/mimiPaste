import { RefreshCw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  errorDisplay,
  type ErrorDisplaySurface,
} from "@/lib/errors/display-policy"
import { cn } from "@/lib/utils"

type ErrorStateSurface = Extract<ErrorDisplaySurface, "page" | "crash">

type ErrorStateProps = {
  className?: string
  error: unknown
  onRetry?: () => void
  surface: ErrorStateSurface
}

export function ErrorState({
  className,
  error,
  onRetry,
  surface,
}: ErrorStateProps) {
  const display = errorDisplay(error, surface)
  return (
    <Empty
      data-slot={`${surface}-error-state`}
      className={cn("min-h-72", className)}
    >
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <TriangleAlert />
        </EmptyMedia>
        <EmptyTitle>{titleForSurface(surface)}</EmptyTitle>
        <EmptyDescription>{display.message}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {display.showRequestReference && display.requestId ? (
          <RequestReference requestId={display.requestId} />
        ) : null}
        {onRetry ? (
          <Button onClick={onRetry}>
            <RefreshCw data-icon="inline-start" />
            重新載入
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  )
}

function RequestReference({ requestId }: { requestId: string }) {
  return (
    <div
      data-slot="error-request-reference"
      className="flex max-w-full flex-col items-center gap-1 text-xs text-muted-foreground"
    >
      <span>參考編號</span>
      <code className="max-w-full truncate rounded-md bg-muted px-2 py-1 font-mono text-foreground">
        {requestId}
      </code>
    </div>
  )
}

function titleForSurface(surface: ErrorStateSurface): string {
  switch (surface) {
    case "page":
      return "資料載入失敗。"
    case "crash":
      return "畫面載入失敗。"
  }
}
