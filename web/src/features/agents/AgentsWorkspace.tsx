import { Check, FileCog, Play, Plus, Save } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Textarea } from "@/components/ui/textarea"

import {
  useAgentMutations,
  useConfigSourceRead,
  useConfigSources,
} from "@/features/agents/agent-queries"
import type { ConfigSource } from "@/features/agents/agent-types"
import {
  useProfileMutations,
  useProfiles,
} from "@/features/profiles/profile-queries"
import type {
  Profile,
  ProfileSaveInput,
} from "@/features/profiles/profile-types"

const newProfileID = "__new_profile__"
const originalProfileName = "原本配置"
const emptyProfiles: Profile[] = []
const emptySources: ConfigSource[] = []

type DraftState = {
  key: string
  value: ProfileSaveInput
}

type ConfigWorkspaceModel = {
  dirty: boolean
  draft: ProfileSaveInput | null
  pending: boolean
  profileID: string | null
  profiles: Profile[]
  selected: Profile | null
  source: ConfigSource | null
  sources: ConfigSource[]
  apply: () => void
  save: () => void
  selectProfile: (id: string) => void
  selectSource: (id: string) => void
  startNew: () => void
  updateDraft: (draft: ProfileSaveInput) => void
}

type WorkspaceActionDeps = {
  agentMutations: ReturnType<typeof useAgentMutations>
  dirty: boolean
  draft: ProfileSaveInput | null
  profileMutations: ReturnType<typeof useProfileMutations>
  profiles: Profile[]
  readQuery: ReturnType<typeof useConfigSourceRead>
  selected: Profile | null
  selectedID: string | null
  setDraftState: (draft: DraftState | null) => void
  setProfileID: (id: string | null) => void
  setSourceID: (id: string | null) => void
  source: ConfigSource | null
}

export function AgentsWorkspace() {
  const model = useConfigWorkspace()
  if (model.sources.length === 0) return <NoConfigFiles />

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <ConfigSwitcher model={model} />
      <ConfigEditor model={model} />
    </section>
  )
}

function useConfigWorkspace(): ConfigWorkspaceModel {
  const sources = useConfigSources().data?.config_sources ?? emptySources
  const profiles = useProfiles().data?.profiles ?? emptyProfiles
  const agentMutations = useAgentMutations()
  const profileMutations = useProfileMutations()
  const [sourceID, setSourceID] = useState<string | null>(null)
  const [profileID, setProfileID] = useState<string | null>(null)
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const source = selectedSource(sources, sourceID)
  const sourceProfiles = profilesForSource(profiles, source)
  const selectedID = selectedIDFor(
    source,
    sourceProfiles,
    profileID,
    draftState
  )
  const selected =
    sourceProfiles.find((profile) => profile.id === selectedID) ?? null
  const readQuery = useConfigSourceRead(source?.id ?? null)
  const content = readQuery.data?.content ?? ""
  const draft = draftFor(source, selected, draftState, content)
  const dirty = draftState !== null
  const pending = mutationsPending(profileMutations, agentMutations)
  const actions = workspaceActions({
    agentMutations,
    dirty,
    draft,
    profileMutations,
    profiles: sourceProfiles,
    readQuery,
    selected,
    selectedID,
    setDraftState,
    setProfileID,
    setSourceID,
    source,
  })
  return {
    dirty,
    draft,
    pending,
    profileID: selectedID,
    profiles: sourceProfiles,
    selected,
    source,
    sources,
    ...actions,
  }
}

function mutationsPending(
  profiles: ReturnType<typeof useProfileMutations>,
  agents: ReturnType<typeof useAgentMutations>
) {
  return (
    profiles.create.isPending ||
    profiles.update.isPending ||
    agents.apply.isPending
  )
}

function workspaceActions({
  agentMutations,
  dirty,
  draft,
  profileMutations,
  profiles,
  readQuery,
  selected,
  selectedID,
  setDraftState,
  setProfileID,
  setSourceID,
  source,
}: WorkspaceActionDeps) {
  return {
    apply: () =>
      applySelected(source, selected, dirty, agentMutations.apply.mutateAsync),
    save: () =>
      saveSelected(
        selected,
        draft,
        profileMutations.create.mutateAsync,
        profileMutations.update.mutateAsync,
        setProfileID,
        setDraftState
      ),
    selectProfile: (id: string) =>
      changeProfile(id, setProfileID, setDraftState),
    selectSource: (id: string) =>
      changeSource(id, setSourceID, setProfileID, setDraftState),
    startNew: () =>
      source &&
      setDraftState(
        newDraft(source, selected, readQuery.data?.content ?? "", profiles)
      ),
    updateDraft: (next: ProfileSaveInput) =>
      setDraftState({ key: selectedID ?? newProfileID, value: next }),
  }
}

function ConfigSwitcher({ model }: { model: ConfigWorkspaceModel }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-4">
        <div className="grid gap-2 lg:grid-cols-[minmax(180px,260px)_minmax(260px,1fr)_auto]">
          <SourceSelect
            source={model.source}
            sources={model.sources}
            onChange={model.selectSource}
          />
          <ProfileSelect
            profileID={model.profileID}
            profiles={model.profiles}
            selected={model.selected}
            source={model.source}
            onChange={model.selectProfile}
            onCreate={model.startNew}
          />
          <ConfigActions model={model} />
        </div>
      </CardContent>
    </Card>
  )
}

function ConfigActions({ model }: { model: ConfigWorkspaceModel }) {
  return (
    <div className="flex flex-wrap items-end justify-end gap-2">
      <Button variant="outline" onClick={model.startNew}>
        <Plus data-icon="inline-start" />
        新增配置
      </Button>
      <Button
        variant="outline"
        disabled={!model.draft || !model.dirty || model.pending}
        onClick={model.save}
      >
        <Save data-icon="inline-start" />
        儲存
      </Button>
      <Button disabled={!model.selected || model.pending} onClick={model.apply}>
        <Play data-icon="inline-start" />
        套用
      </Button>
    </div>
  )
}

function SourceSelect({
  source,
  sources,
  onChange,
}: {
  source: ConfigSource | null
  sources: ConfigSource[]
  onChange: (id: string) => void
}) {
  return (
    <Field>
      <FieldLabel>應用</FieldLabel>
      <Select
        value={source?.id}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger className="w-full">
          <span className="truncate">
            {source ? sourceLabel(source, sources) : "選擇應用"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {sources.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {sourceLabel(item, sources)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function ProfileSelect({
  profileID,
  profiles,
  selected,
  source,
  onChange,
  onCreate,
}: {
  profileID: string | null
  profiles: Profile[]
  selected: Profile | null
  source: ConfigSource | null
  onChange: (id: string) => void
  onCreate: () => void
}) {
  return (
    <Field>
      <FieldLabel>配置</FieldLabel>
      <Select
        value={profileID ?? newProfileID}
        onValueChange={(next) =>
          next === newProfileID ? onCreate() : next && onChange(next)
        }
      >
        <SelectTrigger className="w-full">
          <span className="truncate">
            {selected ? profileLabel(selected, profiles) : "新增配置"}
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {profiles.map((profile) => (
              <SelectItem key={profile.id} value={profile.id}>
                {profileLabel(profile, profiles)}
              </SelectItem>
            ))}
            {source ? (
              <SelectItem value={newProfileID}>新增配置</SelectItem>
            ) : null}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}

function ConfigEditor({ model }: { model: ConfigWorkspaceModel }) {
  const draft = model.draft
  const source = model.source
  if (!source || !draft) return <NoConfigurations />
  const title = model.selected
    ? profileLabel(model.selected, model.profiles)
    : "新增配置"
  return (
    <Card className="flex min-h-0 flex-col">
      <ConfigEditorHeader
        active={model.profileID === source.active_profile_id}
        title={model.profileID === newProfileID ? "新增配置" : title}
      />
      <CardContent className="min-h-0">
        <ConfigEditorFields draft={draft} onDraftChange={model.updateDraft} />
      </CardContent>
    </Card>
  )
}

function ConfigEditorHeader({
  active,
  title,
}: {
  active: boolean
  title: string
}) {
  return (
    <CardHeader>
      <CardTitle className="flex min-w-0 items-center gap-2 text-base">
        <span className="min-w-0 truncate">{title}</span>
        {active ? (
          <Badge variant="secondary">
            <Check data-icon="inline-start" />
            使用中
          </Badge>
        ) : null}
      </CardTitle>
    </CardHeader>
  )
}

function ConfigEditorFields({
  draft,
  onDraftChange,
}: {
  draft: ProfileSaveInput
  onDraftChange: (draft: ProfileSaveInput) => void
}) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel>名稱</FieldLabel>
        <Input
          value={draft.name}
          onChange={(event) =>
            onDraftChange({ ...draft, name: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel>描述</FieldLabel>
        <Input
          value={draft.description}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel>內容</FieldLabel>
        <Textarea
          value={draft.content}
          onChange={(event) =>
            onDraftChange({ ...draft, content: event.target.value })
          }
          className="min-h-[520px] font-mono text-sm"
        />
      </Field>
    </FieldGroup>
  )
}

function NoConfigFiles() {
  return <EmptyCard title="尚未找到配置檔。" content="目前沒有可管理的配置。" />
}

function NoConfigurations() {
  return <EmptyCard title="尚無配置。" content="請新增第一個配置。" />
}

function EmptyCard({ title, content }: { title: string; content: string }) {
  return (
    <Card>
      <CardContent className="flex min-h-72 items-center justify-center">
        <Empty>
          <EmptyHeader>
            <FileCog />
            <EmptyTitle>{title}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>{content}</EmptyContent>
        </Empty>
      </CardContent>
    </Card>
  )
}

function selectedSource(sources: ConfigSource[], id: string | null) {
  return sources.find((source) => source.id === id) ?? sources[0] ?? null
}

function selectedIDFor(
  source: ConfigSource | null,
  profiles: Profile[],
  id: string | null,
  draft: DraftState | null
) {
  if (draft?.key === newProfileID) return newProfileID
  if (id && profiles.some((profile) => profile.id === id)) return id
  if (
    source?.active_profile_id &&
    profiles.some((profile) => profile.id === source.active_profile_id)
  )
    return source.active_profile_id
  return profiles[0]?.id ?? null
}

function profilesForSource(profiles: Profile[], source: ConfigSource | null) {
  if (!source) return emptyProfiles
  return profiles
    .filter((profile) => profileMatchesSource(profile, source))
    .toSorted((left, right) => compareProfiles(left, right, source))
}

function profileMatchesSource(profile: Profile, source: ConfigSource) {
  if (profile.agent_id !== source.agent_id || profile.format !== source.format)
    return false
  return (
    profile.name !== originalProfileName || isOriginalForSource(profile, source)
  )
}

function compareProfiles(left: Profile, right: Profile, source: ConfigSource) {
  const leftOriginal = isOriginalForSource(left, source)
  const rightOriginal = isOriginalForSource(right, source)
  if (leftOriginal !== rightOriginal) return leftOriginal ? -1 : 1
  return timestamp(left.created_at) - timestamp(right.created_at)
}

function isOriginalForSource(profile: Profile, source: ConfigSource) {
  return (
    profile.name === originalProfileName && profile.description === source.name
  )
}

function timestamp(value: string) {
  return new Date(value).getTime()
}

function draftFor(
  source: ConfigSource | null,
  profile: Profile | null,
  draft: DraftState | null,
  fallbackContent: string
) {
  if (draft) return draft.value
  if (profile) return profileToInput(profile)
  if (!source) return null
  return blankProfile(source, fallbackContent)
}

function newDraft(
  source: ConfigSource,
  profile: Profile | null,
  fallbackContent: string,
  profiles: Profile[]
): DraftState {
  const content = profile?.content || fallbackContent
  const nextNumber = profiles.length + 1
  return {
    key: newProfileID,
    value: { ...blankProfile(source, content), name: `配置 ${nextNumber}` },
  }
}

function blankProfile(source: ConfigSource, content: string): ProfileSaveInput {
  return {
    agent_id: source.agent_id,
    name: "",
    description: "",
    format: source.format,
    content,
  }
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

function sourceLabel(source: ConfigSource, sources: ConfigSource[]) {
  const sameApplicationCount = sources.filter(
    (item) => item.agent_name === source.agent_name
  ).length
  if (sameApplicationCount < 2) return source.agent_name
  return `${source.agent_name}：${fileName(source.path)}`
}

function fileName(path: string) {
  return path.split(/[\\/]/).slice(-1)[0] || path
}

function profileLabel(profile: Profile, profiles: Profile[]) {
  const index = profiles.findIndex((item) => item.id === profile.id)
  const number = index >= 0 ? index + 1 : profiles.length + 1
  return `配置 ${number}：${profile.name}`
}

function changeProfile(
  id: string,
  setProfileID: (id: string | null) => void,
  setDraftState: (draft: DraftState | null) => void
) {
  setProfileID(id)
  setDraftState(null)
}

function changeSource(
  id: string,
  setSourceID: (id: string | null) => void,
  setProfileID: (id: string | null) => void,
  setDraftState: (draft: DraftState | null) => void
) {
  setSourceID(id)
  setProfileID(null)
  setDraftState(null)
}

function applySelected(
  source: ConfigSource | null,
  selected: Profile | null,
  dirty: boolean,
  apply: (input: { id: string; profileID: string }) => Promise<unknown>
) {
  if (!source || !selected) return
  if (dirty) {
    toast.error("請先儲存，再套用配置。")
    return
  }
  runAction(applyConfiguration(source, selected, apply))
}

function saveSelected(
  selected: Profile | null,
  draft: ProfileSaveInput | null,
  create: (input: ProfileSaveInput) => Promise<Profile>,
  update: (input: { id: string; input: ProfileSaveInput }) => Promise<Profile>,
  setProfileID: (id: string) => void,
  setDraftState: (draft: DraftState | null) => void
) {
  if (!draft) return
  runAction(
    saveConfiguration(
      selected,
      draft,
      create,
      update,
      setProfileID,
      setDraftState
    )
  )
}

async function saveConfiguration(
  selected: Profile | null,
  draft: ProfileSaveInput,
  create: (input: ProfileSaveInput) => Promise<Profile>,
  update: (input: { id: string; input: ProfileSaveInput }) => Promise<Profile>,
  setProfileID: (id: string) => void,
  setDraftState: (draft: DraftState | null) => void
) {
  const saved = selected
    ? await update({ id: selected.id, input: draft })
    : await create(draft)
  setProfileID(saved.id)
  setDraftState(null)
  toast.success("配置已儲存。")
}

async function applyConfiguration(
  source: ConfigSource,
  selected: Profile,
  apply: (input: { id: string; profileID: string }) => Promise<unknown>
) {
  await apply({ id: source.id, profileID: selected.id })
  toast.success("已套用配置。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
