import { createRoute } from "@tanstack/react-router"

import { SettingsWorkspace } from "@/features/settings/SettingsWorkspace"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/settings",
  component: SettingsRoute,
})

function SettingsRoute() {
  return <SettingsWorkspace />
}
