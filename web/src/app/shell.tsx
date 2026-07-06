import { Outlet, useLocation } from "@tanstack/react-router"
import type { CSSProperties } from "react"

import { AppSidebar } from "@/components/layout/AppSidebar"
import {
  getRouteMeta,
  routeKeyFromPathname,
} from "@/components/layout/app-sidebar-config"
import { ThemeToggle } from "@/components/layout/ThemeToggle"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Toaster } from "@/components/ui/sonner"

export function AppShellLayout() {
  const pathname = useLocation({ select: (location) => location.pathname })
  const currentRouteKey = routeKeyFromPathname(pathname)
  const meta = getRouteMeta(currentRouteKey)

  return (
    <SidebarProvider style={{ "--sidebar-width": "12rem" } as CSSProperties}>
      <AppSidebar currentKey={currentRouteKey} />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-border/60 bg-background/90 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{meta.label}</h1>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {meta.subtitle}
            </p>
          </div>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </header>
        <main className="flex min-h-0 min-w-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  )
}
