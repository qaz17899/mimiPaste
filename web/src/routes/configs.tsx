import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/configs",
  component: lazyRouteComponent(
    () => import("@/features/agents/AgentsWorkspace"),
    "AgentsWorkspace"
  ),
})
