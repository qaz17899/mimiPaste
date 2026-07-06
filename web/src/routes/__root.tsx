import { createRootRoute } from "@tanstack/react-router"

import { AppShellLayout } from "@/app/shell"

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return <AppShellLayout />
}
