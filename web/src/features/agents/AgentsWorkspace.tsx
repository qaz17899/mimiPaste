import { Check, FileCog, Play, Plus, Save } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
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
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import {
  useAgentMutations,
  useConfigSourceRead,
  useConfigSources,
} from "@/features/agents/agent-queries"
import type { ConfigSource } from "@/features/agents/agent-types"
import {
  draftFor,
  newDraft,
  newProfileID,
  profileLabel,
  profileSelectItems,
  profilesForSource,
  selectedIDFor,
  selectedSource,
  sourceLabel,
  type DraftState,
} from "@/features/agents/config-workspace-state"
import {
  useProfileMutations,
  useProfiles,
} from "@/features/profiles/profile-queries"
import type {
  Profile,
  ProfileSaveInput,
} from "@/features/profiles/profile-types"

const emptySources: ConfigSource[] = []
const emptyProfiles: Profile[] = []

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

type ChangeSourceOptions = {
  id: string
  setDraftState: (draft: DraftState | null) => void
  setProfileID: (id: string | null) => void
  setSourceID: (id: string | null) => void
}

type ApplySelectedOptions = {
  apply: (input: { id: string; profileID: string }) => Promise<unknown>
  dirty: boolean
  selected: Profile | null
  source: ConfigSource | null
}

type SaveSelectedOptions = {
  create: (input: ProfileSaveInput) => Promise<Profile>
  draft: ProfileSaveInput | null
  selected: Profile | null
  setDraftState: (draft: DraftState | null) => void
  setProfileID: (id: string) => void
  update: (input: { id: string; input: ProfileSaveInput }) => Promise<Profile>
}

type ConfigSelectionOptions = {
  draftState: DraftState | null
  profileID: string | null
  profiles: Profile[]
  sourceID: string | null
  sources: ConfigSource[]
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
  const selection = configSelection({
    draftState,
    profileID,
    profiles,
    sourceID,
    sources,
  })
  const readQuery = useConfigSourceRead(selection.source?.id ?? null)
  const draft = draftFor({
    draft: draftState,
    fallbackContent: readQuery.data?.content ?? "",
    profile: selection.selected,
    source: selection.source,
  })
  const dirty = draftState !== null
  const pending = mutationsPending(profileMutations, agentMutations)
  const actions = workspaceActions({
    agentMutations,
    dirty,
    draft,
    profileMutations,
    profiles: selection.profiles,
    readQuery,
    selected: selection.selected,
    selectedID: selection.selectedID,
    setDraftState,
    setProfileID,
    setSourceID,
    source: selection.source,
  })
  return {
    dirty,
    draft,
    pending,
    profileID: selection.selectedID,
    profiles: selection.profiles,
    selected: selection.selected,
    source: selection.source,
    sources,
    ...actions,
  }
}

function configSelection({
  draftState,
  profileID,
  profiles,
  sourceID,
  sources,
}: ConfigSelectionOptions) {
  const source = selectedSource(sources, sourceID)
  const sourceProfiles = profilesForSource(profiles, source)
  const selectedID = selectedIDFor({
    draft: draftState,
    id: profileID,
    profiles: sourceProfiles,
    source,
  })
  return {
    profiles: sourceProfiles,
    selected:
      sourceProfiles.find((profile) => profile.id === selectedID) ?? null,
    selectedID,
    source,
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
      applySelected({
        apply: agentMutations.apply.mutateAsync,
        dirty,
        selected,
        source,
      }),
    save: () =>
      saveSelected({
        create: profileMutations.create.mutateAsync,
        draft,
        selected,
        setDraftState,
        setProfileID,
        update: profileMutations.update.mutateAsync,
      }),
    selectProfile: (id: string) =>
      changeProfile(id, setProfileID, setDraftState),
    selectSource: (id: string) =>
      changeSource({ id, setDraftState, setProfileID, setSourceID }),
    startNew: () =>
      source &&
      setDraftState(
        newDraft({
          fallbackContent: readQuery.data?.content ?? "",
          profile: selected,
          profiles,
          source,
        })
      ),
    updateDraft: (next: ProfileSaveInput) =>
      setDraftState({ key: selectedID ?? newProfileID, value: next }),
  }
}

function ConfigSwitcher({ model }: { model: ConfigWorkspaceModel }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>切換配置</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <div
          data-slot="config-switcher-grid"
          className="grid gap-2 lg:grid-cols-[minmax(180px,260px)_minmax(260px,1fr)_auto]"
        >
          <SourceSelect
            source={model.source}
            sources={model.sources}
            onChange={model.selectSource}
          />
          <ProfileSelect
            profileID={model.profileID}
            profiles={model.profiles}
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
    <div
      data-slot="config-actions"
      className="flex flex-wrap items-end justify-end gap-2"
    >
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
  const items = sources.map((item) => ({
    label: sourceLabel(item, sources),
    value: item.id,
  }))
  return (
    <Field>
      <FieldLabel htmlFor="config-source">工具</FieldLabel>
      <Select
        items={items}
        value={source?.id}
        onValueChange={(next) => next && onChange(next)}
      >
        <SelectTrigger id="config-source" className="w-full">
          <SelectValue />
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
  source,
  onChange,
  onCreate,
}: {
  profileID: string | null
  profiles: Profile[]
  source: ConfigSource | null
  onChange: (id: string) => void
  onCreate: () => void
}) {
  const items = profileSelectItems(profiles, source)
  return (
    <Field>
      <FieldLabel htmlFor="config-profile">配置</FieldLabel>
      <Select
        items={items}
        value={profileID ?? newProfileID}
        onValueChange={(next) =>
          next === newProfileID ? onCreate() : next && onChange(next)
        }
      >
        <SelectTrigger id="config-profile" className="w-full">
          <SelectValue />
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
    <Card size="sm" className="flex min-h-0 flex-col">
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
      <CardTitle className="flex min-w-0 items-center gap-2">
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
        <FieldLabel htmlFor="config-name">名稱</FieldLabel>
        <Input
          id="config-name"
          value={draft.name}
          onChange={(event) =>
            onDraftChange({ ...draft, name: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="config-description">描述</FieldLabel>
        <Input
          id="config-description"
          value={draft.description}
          onChange={(event) =>
            onDraftChange({ ...draft, description: event.target.value })
          }
        />
      </Field>
      <Field>
        <FieldLabel htmlFor="config-content">內容</FieldLabel>
        <Textarea
          id="config-content"
          value={draft.content}
          onChange={(event) =>
            onDraftChange({ ...draft, content: event.target.value })
          }
          spellCheck={false}
          className="min-h-[520px] font-mono text-sm leading-6"
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
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileCog />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{content}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function changeProfile(
  id: string,
  setProfileID: (id: string | null) => void,
  setDraftState: (draft: DraftState | null) => void
) {
  setProfileID(id)
  setDraftState(null)
}

function changeSource({
  id,
  setDraftState,
  setProfileID,
  setSourceID,
}: ChangeSourceOptions) {
  setSourceID(id)
  setProfileID(null)
  setDraftState(null)
}

function applySelected({
  apply,
  dirty,
  selected,
  source,
}: ApplySelectedOptions) {
  if (!source || !selected) return
  if (dirty) {
    toast.error("請先儲存，再套用配置。")
    return
  }
  runAction(applyConfiguration(source, selected, apply))
}

function saveSelected({
  create,
  draft,
  selected,
  setDraftState,
  setProfileID,
  update,
}: SaveSelectedOptions) {
  if (!draft) return
  runAction(
    saveConfiguration({
      create,
      draft,
      selected,
      setDraftState,
      setProfileID,
      update,
    })
  )
}

async function saveConfiguration({
  create,
  draft,
  selected,
  setDraftState,
  setProfileID,
  update,
}: SaveSelectedOptions & { draft: ProfileSaveInput }) {
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
