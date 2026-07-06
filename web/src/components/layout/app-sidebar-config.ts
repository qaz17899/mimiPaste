import type { ComponentType } from "react"
import { ArchiveRestore, FileSliders, Settings2, Sparkles } from "lucide-react"

export type AppRouteKey =
  "prompts" | "agents" | "profiles" | "backups" | "settings"

export type NavSectionKey = "workspace" | "config" | "system"

type NavSection = {
  key: NavSectionKey
  label: string
  pinned?: boolean
}

export type NavItem = {
  key: AppRouteKey
  to: string
  label: string
  icon: ComponentType
  section: NavSectionKey
  subtitle: string
  maxWidth: string
}

export const NAV_SECTIONS: readonly NavSection[] = [
  { key: "workspace", label: "工作區" },
  { key: "config", label: "配置" },
  { key: "system", label: "系統", pinned: true },
]

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "prompts",
    to: "/prompts",
    label: "提示詞",
    icon: Sparkles,
    section: "workspace",
    subtitle: "搜尋、編輯與複製提示詞",
    maxWidth: "max-w-[1600px]",
  },
  {
    key: "agents",
    to: "/configs",
    label: "配置",
    icon: FileSliders,
    section: "config",
    subtitle: "編輯、儲存與切換配置",
    maxWidth: "max-w-6xl",
  },
  {
    key: "backups",
    to: "/backups",
    label: "備份",
    icon: ArchiveRestore,
    section: "system",
    subtitle: "檢視與還原設定備份",
    maxWidth: "max-w-5xl",
  },
  {
    key: "settings",
    to: "/settings",
    label: "設定",
    icon: Settings2,
    section: "system",
    subtitle: "資料路徑與外觀",
    maxWidth: "max-w-4xl",
  },
]

export function getRouteMeta(routeKey: AppRouteKey): NavItem {
  return NAV_ITEMS.find((item) => item.key === routeKey) ?? NAV_ITEMS[0]
}

export function routeKeyFromPathname(pathname: string): AppRouteKey {
  const normalized = pathname === "/" ? "/prompts" : pathname
  if (normalized === "/agents") return "agents"
  if (normalized === "/profiles") return "agents"
  if (normalized === "/configs") return "agents"
  return NAV_ITEMS.find((item) => item.to === normalized)?.key ?? "prompts"
}
