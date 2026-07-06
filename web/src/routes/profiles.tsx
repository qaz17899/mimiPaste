import { createRoute } from "@tanstack/react-router"

import { ProfilesWorkspace } from "@/features/profiles/ProfilesWorkspace"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/profiles",
  component: ProfilesRoute,
})

function ProfilesRoute() {
  return <ProfilesWorkspace />
}
