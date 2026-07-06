import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"

export function PlaceholderPanel({
  title,
  action,
}: {
  title: string
  action: string
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>{title}</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>{action}</EmptyContent>
      </Empty>
    </div>
  )
}
