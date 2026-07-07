import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AgentsWorkspace } from "@/features/agents/AgentsWorkspace"
import type { ConfigSource } from "@/features/agents/agent-types"
import type { Profile } from "@/features/profiles/profile-types"

const source: ConfigSource = {
  id: "source_1",
  agent_id: "agent_codex",
  agent_name: "Codex",
  name: "Codex local",
  path: "D:\\config.toml",
  format: "toml",
  active_profile_id: "profile_old",
  active_profile_name: "原本配置",
  created_at: "2026-07-07T00:00:00Z",
  updated_at: "2026-07-07T00:00:00Z",
}

const agent = {
  id: "agent_codex",
  name: "Codex",
  kind: "built-in",
  config_source_count: 0,
  profile_count: 0,
  created_at: "2026-07-07T00:00:00Z",
}

const profile: Profile = {
  id: "profile_1",
  agent_id: "agent_codex",
  agent_name: "Codex",
  name: "日常",
  description: "",
  format: "toml",
  content: "model = \"new\"\n",
  content_masked: false,
  created_at: "2026-07-07T00:00:00Z",
  display_content: "model = \"new\"\n",
  updated_at: "2026-07-07T00:00:00Z",
}

const maskedProfile: Profile = {
  ...profile,
  content: "api_key = \"secret-value\"\n",
  content_masked: true,
  display_content: "api_key = \"********\"\n",
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("AgentsWorkspace", () => {
  it("offers source onboarding when no config source exists", async () => {
    const fetchMock = vi.fn(mockNoSourceFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    renderWithQueryClient(<AgentsWorkspace />)

    expect(await screen.findByText("尚未找到配置檔。")).toBeTruthy()
    await user.type(screen.getByLabelText("名稱"), "Codex local")
    await user.type(screen.getByLabelText("路徑"), "D:\\config.toml")
    await user.click(screen.getByRole("button", { name: "儲存來源" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/config-sources",
        expect.objectContaining({
          body: JSON.stringify({
            agent_id: "agent_codex",
            format: "toml",
            name: "Codex local",
            path: "D:\\config.toml",
          }),
          method: "POST",
        })
      )
    })
  })

  it("creates a custom agent before saving a source", async () => {
    const fetchMock = vi.fn(mockNoSourceFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    renderWithQueryClient(<AgentsWorkspace />)

    await user.click(await screen.findByRole("combobox", { name: "工具" }))
    await user.click(await screen.findByText("自訂工具"))
    await user.type(screen.getByLabelText("工具名稱"), "Mimi CLI")
    await user.type(screen.getByLabelText("名稱"), "Mimi local")
    await user.type(screen.getByLabelText("路徑"), "D:\\mimi\\config.json")
    await user.click(screen.getByRole("button", { name: "儲存來源" }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/agents",
        expect.objectContaining({
          body: JSON.stringify({ name: "Mimi CLI" }),
          method: "POST",
        })
      )
    })
  })

  it("requires a diff preview before applying a config", async () => {
    const fetchMock = vi.fn(mockFetch)
    vi.stubGlobal("fetch", fetchMock)
    const user = userEvent.setup()

    renderWithQueryClient(<AgentsWorkspace />)

    const applyButton = await screen.findByRole("button", {
      name: "套用配置",
    })
    expect((applyButton as HTMLButtonElement).disabled).toBe(true)

    await user.click(screen.getByRole("button", { name: "預覽差異" }))

    expect(await screen.findByText("差異預覽")).toBeTruthy()
    expect(screen.getAllByText(/model = "new"/).length).toBeGreaterThan(0)
    await waitFor(() => {
      expect((applyButton as HTMLButtonElement).disabled).toBe(false)
    })

    await user.click(applyButton)

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/config-sources/source_1/apply",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  it("hides sensitive config content until the user reveals it", async () => {
    vi.stubGlobal("fetch", vi.fn(mockMaskedFetch))
    const user = userEvent.setup()

    renderWithQueryClient(<AgentsWorkspace />)

    const content = (await screen.findByLabelText(
      "內容"
    )) as HTMLTextAreaElement
    expect(content.value).toContain("********")
    expect(content.value).not.toContain("secret-value")

    await user.click(screen.getByRole("button", { name: "顯示完整內容" }))
    expect(content.value).toContain("secret-value")

    await user.click(screen.getByRole("button", { name: "隱藏敏感內容" }))
    expect(content.value).toContain("********")
    expect(content.value).not.toContain("secret-value")
  })
})

function renderWithQueryClient(children: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

function mockFetch(input: RequestInfo | URL): Response {
  const path = String(input)
  if (path === "/api/agents") return jsonResponse({ agents: [agent] })
  if (path === "/api/config-sources") {
    return jsonResponse({ config_sources: [source] })
  }
  if (path === "/api/profiles?") return jsonResponse({ profiles: [profile] })
  if (path === "/api/config-sources/source_1/read") {
    return jsonResponse(configRead("model = \"old\"\n"))
  }
  if (path === "/api/config-sources/source_1/preview") {
    return jsonResponse({
      changed: true,
      diff: "--- 目前內容\n+++ 新內容\n- model = \"old\"\n+ model = \"new\"\n",
    })
  }
  if (path === "/api/config-sources/source_1/apply") {
    return jsonResponse({
      operation: {
        id: "operation_1",
        kind: "apply",
        status: "completed",
        config_source_id: source.id,
        profile_id: profile.id,
        backup_id: "backup_1",
        created_at: "2026-07-07T00:00:00Z",
        updated_at: "2026-07-07T00:00:00Z",
      },
      config: configRead(profile.content),
    })
  }
  return jsonResponse({})
}

function mockMaskedFetch(input: RequestInfo | URL): Response {
  const path = String(input)
  if (path === "/api/agents") return jsonResponse({ agents: [agent] })
  if (path === "/api/config-sources") {
    return jsonResponse({ config_sources: [source] })
  }
  if (path === "/api/profiles?") {
    return jsonResponse({ profiles: [maskedProfile] })
  }
  if (path === "/api/config-sources/source_1/read") {
    return jsonResponse({
      ...configRead("api_key = \"secret-value\"\n"),
      content_masked: true,
      display_content: "api_key = \"********\"\n",
    })
  }
  return jsonResponse({})
}

function mockNoSourceFetch(input: RequestInfo | URL, init?: RequestInit): Response {
  const path = String(input)
  if (path === "/api/agents" && init?.method === "POST") {
    return jsonResponse({ ...agent, id: "agent_custom", name: "Mimi CLI" })
  }
  if (path === "/api/agents") return jsonResponse({ agents: [agent] })
  if (path === "/api/config-sources" && !init) {
    return jsonResponse({ config_sources: [] })
  }
  if (path === "/api/profiles?") return jsonResponse({ profiles: [] })
  if (path === "/api/config-sources" && init?.method === "POST") {
    return jsonResponse(source)
  }
  return jsonResponse({})
}

function configRead(content: string) {
  return {
    source,
    content,
    display_content: content,
    content_masked: false,
    valid: true,
    fields: [],
  }
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  })
}
