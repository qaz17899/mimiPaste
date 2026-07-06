import { useMemo, useState } from "react"
import { FileCog, Plus, Save, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

import {
  useAgentMutations,
  useAgents,
  useConfigSourceRead,
  useConfigSources,
} from "@/features/agents/agent-queries"
import type {
  ConfigSource,
  CreateConfigSourceInput,
} from "@/features/agents/agent-types"

const emptyAgents: {
  id: string
  name: string
  kind: string
  config_source_count: number
  profile_count: number
}[] = []
const emptySources: ConfigSource[] = []
const emptySource: CreateConfigSourceInput = {
  agent_id: "",
  name: "",
  path: "",
  format: "toml",
}

export function AgentsWorkspace() {
  const agentsQuery = useAgents()
  const sourcesQuery = useConfigSources()
  const mutations = useAgentMutations()
  const agents = agentsQuery.data?.agents ?? emptyAgents
  const sources = sourcesQuery.data?.config_sources ?? emptySources
  const [agentName, setAgentName] = useState("")
  const [sourceForm, setSourceForm] =
    useState<CreateConfigSourceInput>(emptySource)
  const [selectedSourceID, setSelectedSourceID] = useState<string | null>(null)
  const [contentDraft, setContentDraft] = useState<{
    sourceID: string
    content: string
  } | null>(null)
  const effectiveSourceID = selectedConfigSourceID(sources, selectedSourceID)
  const readQuery = useConfigSourceRead(effectiveSourceID)
  const selectedSource = useMemo(
    () => sources.find((source) => source.id === effectiveSourceID) ?? null,
    [sources, effectiveSourceID]
  )
  const content =
    contentDraft?.sourceID === effectiveSourceID
      ? contentDraft.content
      : (readQuery.data?.content ?? "")

  return (
    <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(360px,460px)] gap-4">
      <div className="flex min-h-0 flex-col gap-4">
        <AgentCards agents={agents} loading={agentsQuery.isLoading} />
        <ConfigSourceForm
          agents={agents}
          form={sourceForm}
          pending={mutations.createSource.isPending}
          onChange={setSourceForm}
          onSubmit={() =>
            runAction(
              createSource(
                sourceForm,
                mutations.createSource.mutateAsync,
                setSourceForm
              )
            )
          }
        />
        <ConfigSourceList
          sources={sources}
          selectedID={effectiveSourceID}
          onSelect={setSelectedSourceID}
        />
      </div>
      <aside className="flex min-h-0 flex-col gap-4">
        <CustomAgentForm
          value={agentName}
          pending={mutations.createAgent.isPending}
          onChange={setAgentName}
          onSubmit={() =>
            runAction(
              createCustomAgent(
                agentName,
                mutations.createAgent.mutateAsync,
                setAgentName
              )
            )
          }
        />
        <ConfigEditor
          source={selectedSource}
          content={content}
          fields={readQuery.data?.fields ?? []}
          pending={
            mutations.saveSource.isPending || mutations.validateSource.isPending
          }
          onContentChange={(next) =>
            setContentDraft({
              sourceID: effectiveSourceID ?? "",
              content: next,
            })
          }
          onSave={() =>
            selectedSource &&
            window.confirm("覆寫設定檔？") &&
            runAction(
              saveContent(
                selectedSource.id,
                content,
                mutations.saveSource.mutateAsync
              )
            )
          }
          onValidate={() =>
            selectedSource &&
            runAction(
              validateContent(
                selectedSource.id,
                content,
                mutations.validateSource.mutateAsync
              )
            )
          }
        />
      </aside>
    </section>
  )
}

function selectedConfigSourceID(
  sources: ConfigSource[],
  selectedID: string | null
) {
  if (selectedID && sources.some((source) => source.id === selectedID)) {
    return selectedID
  }
  return sources[0]?.id ?? null
}

function AgentCards({
  agents,
  loading,
}: {
  agents: {
    id: string
    name: string
    kind: string
    config_source_count: number
    profile_count: number
  }[]
  loading: boolean
}) {
  if (!loading && agents.length === 0) {
    return <EmptyBlock title="尚無 Agent。" action="請新增 Agent。" />
  }
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      {agents.map((agent) => (
        <Card key={agent.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {agent.name}
              <Badge variant="secondary">
                {agent.kind === "built-in" ? "內建" : "自訂"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {agent.config_source_count} 個設定來源 · {agent.profile_count}{" "}
            個設定檔
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ConfigSourceForm({
  agents,
  form,
  pending,
  onChange,
  onSubmit,
}: {
  agents: { id: string; name: string }[]
  form: CreateConfigSourceInput
  pending: boolean
  onChange: (form: CreateConfigSourceInput) => void
  onSubmit: () => void
}) {
  const agentLabel =
    agents.find((agent) => agent.id === form.agent_id)?.name ?? "選擇 Agent"
  return (
    <Card>
      <CardHeader>
        <CardTitle>新增設定來源</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field>
            <FieldLabel>Agent 類型</FieldLabel>
            <Select
              value={form.agent_id || undefined}
              onValueChange={(agent_id) => {
                if (agent_id) onChange({ ...form, agent_id })
              }}
            >
              <SelectTrigger className="w-full">
                <span className="truncate">{agentLabel}</span>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>設定檔名稱</FieldLabel>
            <Input
              value={form.name}
              onChange={(event) =>
                onChange({ ...form, name: event.target.value })
              }
            />
          </Field>
          <Field>
            <FieldLabel>設定檔路徑</FieldLabel>
            <Input
              value={form.path}
              onChange={(event) =>
                onChange({ ...form, path: event.target.value })
              }
            />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button disabled={pending} onClick={onSubmit}>
          <Plus data-icon="inline-start" />
          新增設定來源
        </Button>
      </CardFooter>
    </Card>
  )
}

function ConfigSourceList({
  sources,
  selectedID,
  onSelect,
}: {
  sources: ConfigSource[]
  selectedID: string | null
  onSelect: (id: string) => void
}) {
  if (sources.length === 0)
    return <EmptyBlock title="尚無設定來源。" action="請新增設定來源。" />
  return (
    <Card>
      <CardHeader>
        <CardTitle>設定來源</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sources.map((source) => (
          <button
            key={source.id}
            data-selected={source.id === selectedID}
            className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50 data-[selected=true]:border-primary"
            onClick={() => onSelect(source.id)}
          >
            <FileCog className="shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {source.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {source.path}
              </span>
            </span>
            <Badge variant="secondary">{source.agent_name}</Badge>
            {source.active_profile_name ? (
              <Badge variant="outline">{source.active_profile_name}</Badge>
            ) : null}
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

function CustomAgentForm({
  value,
  pending,
  onChange,
  onSubmit,
}: {
  value: string
  pending: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>自訂 Agent</CardTitle>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Agent 名稱"
        />
        <Button disabled={pending} onClick={onSubmit}>
          <Plus data-icon="inline-start" />
          新增
        </Button>
      </CardContent>
    </Card>
  )
}

function ConfigEditor({
  source,
  content,
  fields,
  pending,
  onContentChange,
  onSave,
  onValidate,
}: {
  source: ConfigSource | null
  content: string
  fields: { key: string; value: string; sensitive: boolean }[]
  pending: boolean
  onContentChange: (content: string) => void
  onSave: () => void
  onValidate: () => void
}) {
  if (!source)
    return <EmptyBlock title="請選擇設定來源。" action="可讀取與編輯內容。" />
  return (
    <Card className="flex min-h-0 flex-1 flex-col">
      <CardHeader>
        <CardTitle>{source.name}</CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
        <SafeFields fields={fields} />
        <Separator />
        <Textarea
          value={content}
          onChange={(event) => onContentChange(event.target.value)}
          className="min-h-80 flex-1 font-mono"
        />
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" disabled={pending} onClick={onValidate}>
          <ShieldCheck data-icon="inline-start" />
          驗證
        </Button>
        <Button disabled={pending} onClick={onSave}>
          <Save data-icon="inline-start" />
          儲存
        </Button>
      </CardFooter>
    </Card>
  )
}

function SafeFields({
  fields,
}: {
  fields: { key: string; value: string; sensitive: boolean }[]
}) {
  if (fields.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map((field) => (
        <div key={field.key} className="min-w-0 rounded-lg border p-2">
          <div className="truncate text-xs text-muted-foreground">
            {field.key}
          </div>
          <div className="truncate text-sm">
            {field.sensitive ? "••••••" : field.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyBlock({ title, action }: { title: string; action: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-40 items-center justify-center">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{title}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>{action}</EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}

async function createSource(
  form: CreateConfigSourceInput,
  create: (input: CreateConfigSourceInput) => Promise<unknown>,
  setForm: (form: CreateConfigSourceInput) => void
) {
  await create(form)
  setForm(emptySource)
  toast.success("設定來源已新增。")
}

async function createCustomAgent(
  name: string,
  create: (name: string) => Promise<unknown>,
  setName: (name: string) => void
) {
  await create(name)
  setName("")
  toast.success("Agent 已新增。")
}

async function saveContent(
  id: string,
  content: string,
  save: (input: { id: string; content: string }) => Promise<unknown>
) {
  await save({ id, content })
  toast.success("設定已儲存。")
}

async function validateContent(
  id: string,
  content: string,
  validate: (input: {
    id: string
    content: string
  }) => Promise<{ valid: boolean; error?: string }>
) {
  const result = await validate({ id, content })
  if (!result.valid)
    throw new Error(result.error || "設定格式有誤，請修正後再儲存。")
  toast.success("設定格式正確。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
