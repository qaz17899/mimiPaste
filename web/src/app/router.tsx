import { createRouter } from "@tanstack/react-router"

import { Route as rootRoute } from "@/routes/__root"
import { Route as backupsRoute } from "@/routes/backups"
import { Route as configsRoute } from "@/routes/configs"
import { Route as indexRoute } from "@/routes/index"
import { Route as promptsRoute } from "@/routes/prompts"
import { Route as settingsRoute } from "@/routes/settings"

const routeTree = rootRoute.addChildren([
  indexRoute,
  promptsRoute,
  configsRoute,
  backupsRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
})

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
