import { createRoute } from "@tanstack/react-router"

import { BackupsWorkspace } from "@/features/backups/BackupsWorkspace"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/backups",
  component: BackupsRoute,
})

function BackupsRoute() {
  return <BackupsWorkspace />
}
