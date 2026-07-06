import { Link } from "@tanstack/react-router"
import { ClipboardList } from "lucide-react"

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
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ key, to, label: itemLabel, icon: Icon }) => (
            <SidebarMenuItem key={key}>
              <SidebarMenuButton
                render={<Link to={to} />}
                isActive={currentKey === key}
                size={compact ? "sm" : "default"}
                tooltip={itemLabel}
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
  const { pinnedSections, primarySections } = sidebarSections()

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        <SidebarSectionList
          currentKey={currentKey}
          sections={primarySections}
        />
        {pinnedSections.length > 0 && (
          <PinnedSidebarSections
            currentKey={currentKey}
            sections={pinnedSections}
          />
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function sidebarSections() {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: NAV_ITEMS.filter((item) => item.section === section.key),
  }))
  return {
    pinnedSections: sections.filter((section) => section.pinned),
    primarySections: sections.filter((section) => !section.pinned),
  }
}

function SidebarBrand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" className="pointer-events-none">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <ClipboardList />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">mimiPaste</span>
            <span className="truncate text-xs text-sidebar-foreground/70">
              提示詞與配置
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

function SidebarSectionList({
  currentKey,
  sections,
}: {
  currentKey: AppRouteKey
  sections: ReturnType<typeof sidebarSections>["primarySections"]
}) {
  return sections.map((section) => (
    <SidebarNavSection
      key={section.key}
      items={section.items}
      label={section.label}
      currentKey={currentKey}
    />
  ))
}

function PinnedSidebarSections({
  currentKey,
  sections,
}: {
  currentKey: AppRouteKey
  sections: ReturnType<typeof sidebarSections>["pinnedSections"]
}) {
  return (
    <div className="mt-auto flex flex-col">
      <SidebarSeparator className="my-2" />
      {sections.map((section) => (
        <SidebarNavSection
          key={section.key}
          items={section.items}
          label={section.label}
          currentKey={currentKey}
          compact
        />
      ))}
    </div>
  )
}
