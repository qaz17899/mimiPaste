import { createRoute } from "@tanstack/react-router"

import { PromptWorkspace } from "@/features/prompts/PromptWorkspace"
import { Route as RootRoute } from "@/routes/__root"

export const Route = createRoute({
  getParentRoute: () => RootRoute,
  path: "/prompts",
  component: PromptsRoute,
})

function PromptsRoute() {
  return <PromptWorkspace />
}
