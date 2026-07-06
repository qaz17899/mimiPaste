import { useMemo, useState } from "react"
import { Eye, Play, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { useAgentMutations, useAgents, useConfigSources } from "@/features/agents/agent-queries"
import { useProfileMutations, useProfiles } from "@/features/profiles/profile-queries"
import type { Profile, ProfileSaveInput } from "@/features/profiles/profile-types"

const emptyAgents: { id: string; name: string }[] = []
const emptySources: { id: string; name: string; agent_name: string }[] = []
const emptyProfiles: Profile[] = []
const emptyProfile: ProfileSaveInput = {
  agent_id: "",
  name: "",
  description: "",
  format: "toml",
  content: "",
}

export function ProfilesWorkspace() {
  const agents = useAgents().data?.agents ?? emptyAgents
  const sources = useConfigSources().data?.config_sources ?? emptySources
  const profilesQuery = useProfiles()
  const profiles = profilesQuery.data?.profiles ?? emptyProfiles
  const profileMutations = useProfileMutations()
  const agentMutations = useAgentMutations()
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileSaveInput>(emptyProfile)
  const [sourceID, setSourceID] = useState("")
  const [diff, setDiff] = useState("")
  const selected = useMemo(
    () => profiles.find((profile) => profile.id === selectedID) ?? null,
    [profiles, selectedID]
  )

  return (
    <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_minmax(380px,520px)] gap-4">
      <div className="flex min-h-0 flex-col gap-4">
        <ProfileList
          profiles={profiles}
          selectedID={selectedID}
          onDelete={(profile) => runAction(deleteProfile(profile.id, profileMutations.remove.mutateAsync, setSelectedID))}
          onSelect={(profile) => {
            setSelectedID(profile.id)
            setForm(profileToInput(profile))
          }}
        />
        <ApplyPanel
          profiles={profiles}
          sources={sources}
          profileID={selectedID ?? ""}
          sourceID={sourceID}
          diff={diff}
          onProfileChange={setSelectedID}
          onSourceChange={setSourceID}
          onPreview={() => runAction(previewApply(sourceID, selectedID, agentMutations.preview.mutateAsync, setDiff))}
          onApply={() => runAction(applyProfile(sourceID, selectedID, agentMutations.apply.mutateAsync))}
        />
      </div>
      <ProfileEditor
        agents={agents}
        form={form}
        selected={selected}
        pending={profileMutations.create.isPending || profileMutations.update.isPending}
        onChange={setForm}
        onNew={() => {
          setSelectedID(null)
          setForm(emptyProfile)
        }}
        onSave={() =>
          runAction(saveProfile(selected, form, profileMutations.create.mutateAsync, profileMutations.update.mutateAsync, setSelectedID))
        }
      />
    </section>
  )
}

function ProfileList({
  profiles,
  selectedID,
  onDelete,
  onSelect,
}: {
  profiles: Profile[]
  selectedID: string | null
  onDelete: (profile: Profile) => void
  onSelect: (profile: Profile) => void
}) {
  if (profiles.length === 0) return <EmptyBlock title="尚無設定檔。" action="請新增設定檔。" />
  return (
    <Card>
      <CardHeader>
        <CardTitle>設定檔</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {profiles.map((profile) => (
          <button
            key={profile.id}
            data-selected={profile.id === selectedID}
            className="flex min-w-0 items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50 data-[selected=true]:border-primary"
            onClick={() => onSelect(profile)}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{profile.name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {profile.agent_name} · {profile.description}
              </span>
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(event) => {
                event.stopPropagation()
                if (window.confirm("刪除這個設定檔？")) onDelete(profile)
              }}
            >
              <Trash2 />
            </Button>
          </button>
        ))}
      </CardContent>
    </Card>
  )
}

function ProfileEditor({
  agents,
  form,
  selected,
  pending,
  onChange,
  onNew,
  onSave,
}: {
  agents: { id: string; name: string }[]
  form: ProfileSaveInput
  selected: Profile | null
  pending: boolean
  onChange: (form: ProfileSaveInput) => void
  onNew: () => void
  onSave: () => void
}) {
  const agentLabel = agents.find((agent) => agent.id === form.agent_id)?.name ?? "選擇 Agent"
  return (
    <Card className="flex min-h-0 flex-col">
      <CardHeader>
        <CardTitle>{selected ? "編輯設定檔" : "新增設定檔"}</CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-auto">
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
            <Input value={form.name} onChange={(event) => onChange({ ...form, name: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel>描述</FieldLabel>
            <Input value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} />
          </Field>
          <Field>
            <FieldLabel>原文編輯</FieldLabel>
            <Textarea value={form.content} onChange={(event) => onChange({ ...form, content: event.target.value })} className="min-h-96 font-mono" />
          </Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={onNew}>
          <Plus data-icon="inline-start" />
          新增
        </Button>
        <Button disabled={pending} onClick={onSave}>
          <Save data-icon="inline-start" />
          儲存
        </Button>
      </CardFooter>
    </Card>
  )
}

function ApplyPanel({
  profiles,
  sources,
  profileID,
  sourceID,
  diff,
  onProfileChange,
  onSourceChange,
  onPreview,
  onApply,
}: {
  profiles: Profile[]
  sources: { id: string; name: string; agent_name: string }[]
  profileID: string
  sourceID: string
  diff: string
  onProfileChange: (id: string) => void
  onSourceChange: (id: string) => void
  onPreview: () => void
  onApply: () => void
}) {
  const sourceLabel = sources.find((source) => source.id === sourceID)
  const profileLabel = profiles.find((profile) => profile.id === profileID)
  return (
    <Card className="min-h-0">
      <CardHeader>
        <CardTitle>套用設定檔</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Select
          value={sourceID || undefined}
          onValueChange={(next) => {
            if (next) onSourceChange(next)
          }}
        >
          <SelectTrigger className="w-full">
            <span className="truncate">
              {sourceLabel ? `${sourceLabel.agent_name} · ${sourceLabel.name}` : "選擇設定來源"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {sources.map((source) => (
                <SelectItem key={source.id} value={source.id}>
                  {source.agent_name} · {source.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <Select
          value={profileID || undefined}
          onValueChange={(next) => {
            if (next) onProfileChange(next)
          }}
        >
          <SelectTrigger className="w-full">
            <span className="truncate">
              {profileLabel ? `${profileLabel.agent_name} · ${profileLabel.name}` : "選擇設定檔"}
            </span>
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.agent_name} · {profile.name}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {diff ? <pre className="max-h-72 overflow-auto rounded-lg border bg-muted/30 p-3 text-xs whitespace-pre-wrap">{diff}</pre> : null}
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" onClick={onPreview}>
          <Eye data-icon="inline-start" />
          預覽差異
        </Button>
        <Button onClick={onApply}>
          <Play data-icon="inline-start" />
          套用設定檔
        </Button>
      </CardFooter>
    </Card>
  )
}

function EmptyBlock({ title, action }: { title: string; action: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-52 items-center justify-center">
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

function profileToInput(profile: Profile): ProfileSaveInput {
  return {
    agent_id: profile.agent_id,
    name: profile.name,
    description: profile.description,
    format: profile.format,
    content: profile.content,
  }
}

async function saveProfile(
  selected: Profile | null,
  form: ProfileSaveInput,
  create: (input: ProfileSaveInput) => Promise<Profile>,
  update: (input: { id: string; input: ProfileSaveInput }) => Promise<Profile>,
  setSelectedID: (id: string) => void
) {
  const saved = selected ? await update({ id: selected.id, input: form }) : await create(form)
  setSelectedID(saved.id)
  toast.success("設定檔已儲存。")
}

async function deleteProfile(id: string, remove: (id: string) => Promise<void>, setSelectedID: (id: string | null) => void) {
  await remove(id)
  setSelectedID(null)
  toast.success("設定檔已刪除。")
}

async function previewApply(
  sourceID: string,
  profileID: string | null,
  preview: (input: { id: string; profileID: string }) => Promise<{ diff: string }>,
  setDiff: (diff: string) => void
) {
  const result = await preview({ id: sourceID, profileID: profileID ?? "" })
  setDiff(result.diff)
}

async function applyProfile(
  sourceID: string,
  profileID: string | null,
  apply: (input: { id: string; profileID: string }) => Promise<unknown>
) {
  if (!window.confirm("套用設定檔會覆寫目前內容。")) return
  await apply({ id: sourceID, profileID: profileID ?? "" })
  toast.success("設定已套用。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
