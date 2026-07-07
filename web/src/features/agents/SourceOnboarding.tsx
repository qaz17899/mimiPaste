import { Plus, Save } from "lucide-react"
import type { FormEvent } from "react"
import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { useAgentMutations, useAgents } from "@/features/agents/agent-queries"
import type {
  Agent,
  ConfigSource,
  CreateConfigSourceInput,
} from "@/features/agents/agent-types"
import { actionErrorMessage } from "@/lib/errors/display-policy"
import { UserVisibleError } from "@/lib/errors/user-visible-error"

const customAgentValue = "__custom_agent__"
const defaultFormat = "toml"

type SourceDraft = {
  agentID: string
  customAgentName: string
  format: CreateConfigSourceInput["format"]
  name: string
  path: string
}

type SourceOnboardingProps = {
  compact?: boolean
  onCreated?: (source: ConfigSource) => void
}

type SourceOnboardingFormProps = {
  agents: Agent[]
  compact: boolean
  draft: SourceDraft
  error: string
  mutations: ReturnType<typeof useAgentMutations>
  onCreated?: (source: ConfigSource) => void
  setDraft: (draft: SourceDraft) => void
  setError: (error: string) => void
  setOpen: (open: boolean) => void
}

export function SourceOnboarding({
  compact = false,
  onCreated,
}: SourceOnboardingProps) {
  const agents = useAgents().data?.agents ?? []
  const mutations = useAgentMutations()
  const [open, setOpen] = useState(!compact)
  const [error, setError] = useState("")
  const [draft, setDraft] = useState<SourceDraft>(blankDraft)

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus data-icon="inline-start" />
        新增來源
      </Button>
    )
  }

  return (
    <SourceOnboardingForm
      agents={agents}
      compact={compact}
      draft={draft}
      error={error}
      mutations={mutations}
      onCreated={onCreated}
      setDraft={setDraft}
      setError={setError}
      setOpen={setOpen}
    />
  )
}

function SourceOnboardingForm({
  agents,
  compact,
  draft,
  error,
  mutations,
  onCreated,
  setDraft,
  setError,
  setOpen,
}: SourceOnboardingFormProps) {
  const pending =
    mutations.createAgent.isPending || mutations.createSource.isPending
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>新增來源</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={handleSourceSubmit({
            agents,
            createAgent: mutations.createAgent.mutateAsync,
            createSource: mutations.createSource.mutateAsync,
            draft,
            onCreated,
            setDraft,
            setError,
          })}
        >
          <SourceFields agents={agents} draft={draft} onDraftChange={setDraft} />
          {error ? <FieldError>{error}</FieldError> : null}
          <SourceActions
            compact={compact}
            pending={pending}
            onCancel={() => setOpen(false)}
          />
        </form>
      </CardContent>
    </Card>
  )
}

function SourceActions({
  compact,
  onCancel,
  pending,
}: {
  compact: boolean
  onCancel: () => void
  pending: boolean
}) {
  return (
    <div className="flex justify-end gap-2">
      {compact ? (
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
      ) : null}
      <Button type="submit" disabled={pending}>
        <Save data-icon="inline-start" />
        儲存來源
      </Button>
    </div>
  )
}

function SourceFields({
  agents,
  draft,
  onDraftChange,
}: {
  agents: Agent[]
  draft: SourceDraft
  onDraftChange: (draft: SourceDraft) => void
}) {
  const agentValue = draft.agentID || agents[0]?.id || ""
  return (
    <FieldGroup>
      <AgentSelectField
        agents={agents}
        value={agentValue}
        onChange={(value) => onDraftChange({ ...draft, agentID: value })}
      />
      {agentValue === customAgentValue ? (
        <SourceInput
          id="source-custom-agent"
          label="工具名稱"
          value={draft.customAgentName}
          onChange={(value) =>
            onDraftChange({ ...draft, customAgentName: value })
          }
        />
      ) : null}
      <SourceInput
        id="source-name"
        label="名稱"
        value={draft.name}
        onChange={(value) => onDraftChange({ ...draft, name: value })}
      />
      <SourceInput
        id="source-path"
        label="路徑"
        value={draft.path}
          onChange={(value) => onDraftChange({ ...draft, path: value })}
      />
      <FormatSelectField
        value={draft.format}
        onChange={(format) => onDraftChange({ ...draft, format })}
      />
    </FieldGroup>
  )
}

function AgentSelectField({
  agents,
  onChange,
  value,
}: {
  agents: Agent[]
  onChange: (value: string) => void
  value: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor="source-agent">工具</FieldLabel>
      <Select
        items={agentItems(agents)}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <SelectTrigger id="source-agent">
          <SelectValue placeholder="選擇工具" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {agents.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
            <SelectItem value={customAgentValue}>自訂工具</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function FormatSelectField({
  onChange,
  value,
}: {
  onChange: (format: SourceDraft["format"]) => void
  value: SourceDraft["format"]
}) {
  return (
    <Field>
      <FieldLabel htmlFor="source-format">格式</FieldLabel>
      <Select
        items={formatItems}
        value={value}
        onValueChange={(next) =>
          onChange((next ?? defaultFormat) as SourceDraft["format"])
        }
      >
        <SelectTrigger id="source-format">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {formatItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function SourceInput({
  id,
  label,
  onChange,
  value,
}: {
  id: string
  label: string
  onChange: (value: string) => void
  value: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

async function submitSource({
  agents,
  createAgent,
  createSource,
  draft,
  onCreated,
  setDraft,
  setError,
}: {
  agents: Agent[]
  createAgent: (name: string) => Promise<Agent>
  createSource: (input: CreateConfigSourceInput) => Promise<ConfigSource>
  draft: SourceDraft
  onCreated?: (source: ConfigSource) => void
  setDraft: (draft: SourceDraft) => void
  setError: (error: string) => void
}) {
  setError("")
  const input = validatedSourceInput(draft, agents)
  const agentID = await resolveAgentID(draft, agents, createAgent)
  const source = await createSource({ ...input, agent_id: agentID })
  setDraft(blankDraft)
  onCreated?.(source)
  toast.success("來源已新增。")
}

function handleSourceSubmit(options: {
  agents: Agent[]
  createAgent: (name: string) => Promise<Agent>
  createSource: (input: CreateConfigSourceInput) => Promise<ConfigSource>
  draft: SourceDraft
  onCreated?: (source: ConfigSource) => void
  setDraft: (draft: SourceDraft) => void
  setError: (error: string) => void
}) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitSource(options).catch((cause: unknown) =>
      options.setError(actionErrorMessage(cause))
    )
  }
}

async function resolveAgentID(
  draft: SourceDraft,
  agents: Agent[],
  createAgent: (name: string) => Promise<Agent>
) {
  if (draft.agentID === customAgentValue) {
    const created = await createAgent(draft.customAgentName.trim())
    return created.id
  }
  return draft.agentID || agents[0]?.id || ""
}

function validatedSourceInput(
  draft: SourceDraft,
  agents: Agent[]
): CreateConfigSourceInput {
  if (draft.agentID === customAgentValue && !draft.customAgentName.trim())
    throw new UserVisibleError("工具名稱不可空白。")
  if (!draft.agentID && agents.length === 0) {
    throw new UserVisibleError("請先選擇工具。")
  }
  if (!draft.name.trim()) throw new UserVisibleError("名稱不可空白。")
  if (!isAbsolutePath(draft.path))
    throw new UserVisibleError("路徑必須是完整路徑。")
  return {
    agent_id: "",
    format: draft.format,
    name: draft.name.trim(),
    path: draft.path.trim(),
  }
}

function isAbsolutePath(path: string) {
  const value = path.trim()
  return /^([a-zA-Z]:[\\/]|\\\\|\/)/.test(value)
}

function agentItems(agents: Agent[]) {
  return [
    ...agents.map((agent) => ({ label: agent.name, value: agent.id })),
    { label: "自訂工具", value: customAgentValue },
  ]
}

const formatItems = [
  { label: "TOML", value: "toml" },
  { label: "JSON", value: "json" },
  { label: "Text", value: "text" },
] as const

const blankDraft: SourceDraft = {
  agentID: "",
  customAgentName: "",
  format: defaultFormat,
  name: "",
  path: "",
}
