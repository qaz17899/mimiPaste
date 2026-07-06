import { createRoute, Navigate } from "@tanstack/react-router"

import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/",
  component: IndexRoute,
})

function IndexRoute() {
  return <Navigate to="/prompts" replace />
}
