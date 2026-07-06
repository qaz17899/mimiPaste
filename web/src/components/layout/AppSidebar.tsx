import { Link } from "@tanstack/react-router"
import { ClipboardList } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  NAV_ITEMS,
  NAV_SECTIONS,
  type AppRouteKey,
  type NavItem,
} from "@/components/layout/app-sidebar-config"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"

function SidebarNavSection({
  items,
  label,
  currentKey,
  compact = false,
}: {
  items: readonly NavItem[]
  label: string
  currentKey: AppRouteKey
  compact?: boolean
}) {
  if (!items.length) return null

  return (
    <SidebarGroup className={cn(compact && "pt-1")}>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className={cn(compact ? "gap-0.5" : "gap-1")}>
          {items.map(({ key, to, label: itemLabel, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                render={<Link to={to} />}
                isActive={currentKey === key}
                tooltip={itemLabel}
                className={cn(compact ? "h-8 text-[13px]" : "h-9")}
              >
                <Icon />
                <span>{itemLabel}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AppSidebar({ currentKey }: { currentKey: AppRouteKey }) {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: NAV_ITEMS.filter((item) => item.section === section.key),
  }))
  const primarySections = sections.filter((section) => !section.pinned)
  const pinnedSections = sections.filter((section) => section.pinned)

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ClipboardList />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">mimiPaste</span>
                <span className="truncate text-xs text-sidebar-foreground/70">
                  提示詞與 Agent 設定
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {primarySections.map((section) => (
          <SidebarNavSection
            key={section.key}
            items={section.items}
            label={section.label}
            currentKey={currentKey}
          />
        ))}
        {pinnedSections.length > 0 && (
          <div className="mt-auto flex flex-col">
            <SidebarSeparator className="my-2" />
            {pinnedSections.map((section) => (
              <SidebarNavSection
                key={section.key}
                items={section.items}
                label={section.label}
                currentKey={currentKey}
                compact
              />
            ))}
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
