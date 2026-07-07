import { createRoute, lazyRouteComponent } from "@tanstack/react-router"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/prompts",
  component: lazyRouteComponent(
    () => import("@/features/prompts/PromptWorkspace"),
    "PromptWorkspace"
  ),
})
