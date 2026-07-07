import { useState } from "react"
import { toast } from "sonner"

import {
  useAgentMutations,
  useConfigSourceRead,
  useConfigSources,
} from "@/features/agents/agent-queries"
import type {
  ConfigReadResult,
  ConfigSource,
} from "@/features/agents/agent-types"
import {
  draftFor,
  newDraft,
  newProfileID,
  profilesForSource,
  selectedIDFor,
  selectedSource,
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
import { actionErrorMessage } from "@/lib/errors/display-policy"

const emptySources: ConfigSource[] = []
const emptyProfiles: Profile[] = []

export type ConfigWorkspaceModel = {
  applyPreview: ApplyPreviewState | null
  applyPreviewReady: boolean
  canToggleContentReveal: boolean
  dirty: boolean
  draft: ProfileSaveInput | null
  pending: boolean
  profileID: string | null
  profiles: Profile[]
  selected: Profile | null
  source: ConfigSource | null
  sources: ConfigSource[]
  apply: () => void
  hideContent: () => void
  previewApply: () => void
  revealContent: () => void
  save: () => void
  selectProfile: (id: string) => void
  selectSource: (id: string) => void
  startNew: () => void
  updateDraft: (draft: ProfileSaveInput) => void
}

type ApplyPreviewState = {
  changed: boolean
  diff: string
  profileID: string
  profileUpdatedAt: string
  sourceID: string
}

type WorkspaceActionDeps = {
  agentMutations: ReturnType<typeof useAgentMutations>
  applyPreviewReady: boolean
  dirty: boolean
  draft: ProfileSaveInput | null
  profileMutations: ReturnType<typeof useProfileMutations>
  profiles: Profile[]
  readQuery: ReturnType<typeof useConfigSourceRead>
  selected: Profile | null
  selectedID: string | null
  setApplyPreview: (preview: ApplyPreviewState | null) => void
  setDraftState: (draft: DraftState | null) => void
  setProfileID: (id: string | null) => void
  setSourceID: (id: string | null) => void
  source: ConfigSource | null
}

type ChangeSourceOptions = {
  id: string
  setApplyPreview: (preview: ApplyPreviewState | null) => void
  setDraftState: (draft: DraftState | null) => void
  setProfileID: (id: string | null) => void
  setSourceID: (id: string | null) => void
}

type StartNewProfileOptions = {
  fallbackContent: string
  fallbackContentMasked: boolean
  profiles: Profile[]
  selected: Profile | null
  setApplyPreview: (preview: ApplyPreviewState | null) => void
  setDraftState: (draft: DraftState | null) => void
  source: ConfigSource
}

type ApplySelectedOptions = {
  apply: (input: { id: string; profileID: string }) => Promise<unknown>
  applyPreviewReady: boolean
  dirty: boolean
  setApplyPreview: (preview: ApplyPreviewState | null) => void
  selected: Profile | null
  source: ConfigSource | null
}

type PreviewSelectedOptions = {
  dirty: boolean
  preview: (input: { id: string; profileID: string }) => Promise<{
    changed: boolean
    diff: string
  }>
  selected: Profile | null
  setApplyPreview: (preview: ApplyPreviewState | null) => void
  source: ConfigSource | null
}

type SaveSelectedOptions = {
  create: (input: ProfileSaveInput) => Promise<Profile>
  draft: ProfileSaveInput | null
  selected: Profile | null
  setApplyPreview: (preview: ApplyPreviewState | null) => void
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

type ContentRevealOptions = {
  draft: ProfileSaveInput | null
  readResult: ConfigReadResult | undefined
  selected: Profile | null
  selectedID: string | null
  setDraftState: (draft: DraftState | null) => void
}

export function useConfigWorkspace(): ConfigWorkspaceModel {
  const sources = useConfigSources().data?.config_sources ?? emptySources
  const profiles = useProfiles().data?.profiles ?? emptyProfiles
  const agentMutations = useAgentMutations()
  const profileMutations = useProfileMutations()
  const [sourceID, setSourceID] = useState<string | null>(null)
  const [profileID, setProfileID] = useState<string | null>(null)
  const [draftState, setDraftState] = useState<DraftState | null>(null)
  const [applyPreview, setApplyPreview] = useState<ApplyPreviewState | null>(
    null
  )
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
    fallbackContent: readQuery.data?.display_content ?? "",
    fallbackContentMasked: readQuery.data?.content_masked ?? false,
    profile: selection.selected,
    source: selection.source,
  })
  const dirty = draftState !== null
  const pending = mutationsPending(profileMutations, agentMutations)
  const applyPreviewReady = previewMatches(
    applyPreview,
    selection.source,
    selection.selected
  )
  const actions = workspaceActions({
    agentMutations,
    applyPreviewReady,
    dirty,
    draft,
    profileMutations,
    profiles: selection.profiles,
    readQuery,
    selected: selection.selected,
    selectedID: selection.selectedID,
    setApplyPreview,
    setDraftState,
    setProfileID,
    setSourceID,
    source: selection.source,
  })
  return {
    applyPreview,
    applyPreviewReady,
    canToggleContentReveal: canToggleContentReveal(
      draft,
      readQuery.data,
      selection.selected
    ),
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
    agents.preview.isPending ||
    agents.apply.isPending
  )
}

function workspaceActions(deps: WorkspaceActionDeps) {
  return {
    ...operationActions(deps),
    ...selectionActions(deps),
  }
}

function operationActions({
  agentMutations,
  applyPreviewReady,
  dirty,
  draft,
  profileMutations,
  readQuery,
  selected,
  selectedID,
  setApplyPreview,
  setDraftState,
  setProfileID,
  source,
}: WorkspaceActionDeps) {
  const revealOptions = {
    draft,
    readResult: readQuery.data,
    selected,
    selectedID,
    setDraftState,
  }
  return {
    apply: () =>
      applySelected({
        apply: agentMutations.apply.mutateAsync,
        applyPreviewReady,
        dirty,
        selected,
        setApplyPreview,
        source,
      }),
    hideContent: () => hideContent(revealOptions),
    previewApply: () =>
      previewSelected({
        dirty,
        preview: agentMutations.preview.mutateAsync,
        selected,
        setApplyPreview,
        source,
      }),
    revealContent: () => revealContent(revealOptions),
    save: () =>
      saveSelected({
        create: profileMutations.create.mutateAsync,
        draft,
        selected,
        setApplyPreview,
        setDraftState,
        setProfileID,
        update: profileMutations.update.mutateAsync,
      }),
  }
}

function selectionActions({
  profiles,
  readQuery,
  selected,
  selectedID,
  setApplyPreview,
  setDraftState,
  setProfileID,
  setSourceID,
  source,
}: WorkspaceActionDeps) {
  return {
    selectProfile: (id: string) =>
      changeProfile(id, setProfileID, setDraftState, setApplyPreview),
    selectSource: (id: string) =>
      changeSource({
        id,
        setApplyPreview,
        setDraftState,
        setProfileID,
        setSourceID,
      }),
    startNew: () =>
      source &&
      startNewProfile({
        fallbackContent: readQuery.data?.display_content ?? "",
        fallbackContentMasked: readQuery.data?.content_masked ?? false,
        profiles,
        selected,
        setApplyPreview,
        setDraftState,
        source,
      }),
    updateDraft: (next: ProfileSaveInput) => {
      setApplyPreview(null)
      setDraftState({ key: selectedID ?? newProfileID, value: next })
    },
  }
}

function changeProfile(
  id: string,
  setProfileID: (id: string | null) => void,
  setDraftState: (draft: DraftState | null) => void,
  setApplyPreview: (preview: ApplyPreviewState | null) => void
) {
  setApplyPreview(null)
  setProfileID(id)
  setDraftState(null)
}

function changeSource({
  id,
  setApplyPreview,
  setDraftState,
  setProfileID,
  setSourceID,
}: ChangeSourceOptions) {
  setApplyPreview(null)
  setSourceID(id)
  setProfileID(null)
  setDraftState(null)
}

function startNewProfile({
  fallbackContent,
  fallbackContentMasked,
  profiles,
  selected,
  setApplyPreview,
  setDraftState,
  source,
}: StartNewProfileOptions) {
  setApplyPreview(null)
  setDraftState(
    newDraft({
      fallbackContent,
      fallbackContentMasked,
      profile: selected,
      profiles,
      source,
    })
  )
}

function previewMatches(
  preview: ApplyPreviewState | null,
  source: ConfigSource | null,
  selected: Profile | null
) {
  return (
    preview !== null &&
    source !== null &&
    selected !== null &&
    preview.sourceID === source.id &&
    preview.profileID === selected.id &&
    preview.profileUpdatedAt === selected.updated_at
  )
}

function canToggleContentReveal(
  draft: ProfileSaveInput | null,
  readResult: ConfigReadResult | undefined,
  selected: Profile | null
) {
  return Boolean(
    draft &&
      (draft.content_masked ||
        selected?.content_masked ||
        readResult?.content_masked)
  )
}

function revealContent({
  draft,
  readResult,
  selected,
  selectedID,
  setDraftState,
}: ContentRevealOptions) {
  if (!draft) return
  setDraftState({
    key: selectedID ?? newProfileID,
    value: {
      ...draft,
      content: rawContent(readResult, selected),
      content_masked: false,
    },
  })
}

function hideContent({
  draft,
  readResult,
  selected,
  selectedID,
  setDraftState,
}: ContentRevealOptions) {
  if (!draft) return
  setDraftState({
    key: selectedID ?? newProfileID,
    value: {
      ...draft,
      content: displayContent(readResult, selected),
      content_masked: true,
    },
  })
}

function rawContent(
  readResult: ConfigReadResult | undefined,
  selected: Profile | null
) {
  return selected?.content ?? readResult?.content ?? ""
}

function displayContent(
  readResult: ConfigReadResult | undefined,
  selected: Profile | null
) {
  return selected?.display_content ?? readResult?.display_content ?? ""
}

function applySelected({
  apply,
  applyPreviewReady,
  dirty,
  setApplyPreview,
  selected,
  source,
}: ApplySelectedOptions) {
  if (!source || !selected) return
  if (dirty) {
    toast.error("請先儲存，再套用配置。")
    return
  }
  if (!applyPreviewReady) {
    toast.error("請先預覽差異。")
    return
  }
  runAction(applyConfiguration(source, selected, apply, setApplyPreview))
}

function previewSelected({
  dirty,
  preview,
  selected,
  setApplyPreview,
  source,
}: PreviewSelectedOptions) {
  if (!source || !selected) return
  if (dirty) {
    toast.error("請先儲存，再預覽差異。")
    return
  }
  runAction(previewConfiguration(source, selected, preview, setApplyPreview))
}

function saveSelected({
  create,
  draft,
  selected,
  setApplyPreview,
  setDraftState,
  setProfileID,
  update,
}: SaveSelectedOptions) {
  if (!draft) return
  if (draft.content_masked) {
    toast.error("內容仍包含遮蔽值，請先顯示完整內容再儲存。")
    return
  }
  runAction(
    saveConfiguration({
      create,
      draft,
      selected,
      setApplyPreview,
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
  setApplyPreview,
  setDraftState,
  setProfileID,
  update,
}: SaveSelectedOptions & { draft: ProfileSaveInput }) {
  const saved = selected
    ? await update({ id: selected.id, input: draft })
    : await create(draft)
  setApplyPreview(null)
  setProfileID(saved.id)
  setDraftState(null)
  toast.success("配置已儲存。")
}

async function previewConfiguration(
  source: ConfigSource,
  selected: Profile,
  preview: (input: { id: string; profileID: string }) => Promise<{
    changed: boolean
    diff: string
  }>,
  setApplyPreview: (preview: ApplyPreviewState | null) => void
) {
  const result = await preview({ id: source.id, profileID: selected.id })
  setApplyPreview({
    changed: result.changed,
    diff: result.diff,
    profileID: selected.id,
    profileUpdatedAt: selected.updated_at,
    sourceID: source.id,
  })
  toast.success("差異已更新。")
}

async function applyConfiguration(
  source: ConfigSource,
  selected: Profile,
  apply: (input: { id: string; profileID: string }) => Promise<unknown>,
  setApplyPreview: (preview: ApplyPreviewState | null) => void
) {
  await apply({ id: source.id, profileID: selected.id })
  setApplyPreview(null)
  toast.success("已套用配置。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(actionErrorMessage(error))
  })
}
