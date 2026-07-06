import { createRoute } from "@tanstack/react-router"

import { AgentsWorkspace } from "@/features/agents/AgentsWorkspace"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/configs",
  component: ConfigsRoute,
})

function ConfigsRoute() {
  return <AgentsWorkspace />
}
