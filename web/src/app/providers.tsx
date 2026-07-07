import {
  QueryClientProvider,
  QueryErrorResetBoundary,
} from "@tanstack/react-query"
import { RouterProvider } from "@tanstack/react-router"

import { AppErrorBoundary } from "@/app/error-boundary"
import { queryClient } from "@/app/query-client"
import { router } from "@/app/router"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"

export function AppProviders() {
  return (
    <ThemeProvider storageKey="mimipaste-theme">
      <QueryClientProvider client={queryClient}>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <AppErrorBoundary onReset={reset}>
              <TooltipProvider>
                <RouterProvider router={router} />
              </TooltipProvider>
            </AppErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
