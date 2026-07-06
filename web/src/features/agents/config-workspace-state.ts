import type { ConfigSource } from "@/features/agents/agent-types"
import type {
  Profile,
  ProfileSaveInput,
} from "@/features/profiles/profile-types"

export const newProfileID = "__new_profile__"

const originalProfileName = "原本配置"
const emptyProfiles: Profile[] = []

export type DraftState = {
  key: string
  value: ProfileSaveInput
}

type SelectedIDOptions = {
  draft: DraftState | null
  id: string | null
  profiles: Profile[]
  source: ConfigSource | null
}

type DraftForOptions = {
  draft: DraftState | null
  fallbackContent: string
  profile: Profile | null
  source: ConfigSource | null
}

type NewDraftOptions = {
  fallbackContent: string
  profile: Profile | null
  profiles: Profile[]
  source: ConfigSource
}

export function selectedSource(sources: ConfigSource[], id: string | null) {
  return sources.find((source) => source.id === id) ?? sources[0] ?? null
}

export function selectedIDFor({
  draft,
  id,
  profiles,
  source,
}: SelectedIDOptions) {
  if (draft?.key === newProfileID) return newProfileID
  if (id && profiles.some((profile) => profile.id === id)) return id
  const activeID = source?.active_profile_id
  if (activeID && profiles.some((profile) => profile.id === activeID))
    return activeID
  return profiles[0]?.id ?? null
}

export function profilesForSource(
  profiles: Profile[],
  source: ConfigSource | null
) {
  if (!source) return emptyProfiles
  return profiles
    .filter((profile) => profileMatchesSource(profile, source))
    .toSorted((left, right) => compareProfiles(left, right, source))
}

export function draftFor({
  draft,
  fallbackContent,
  profile,
  source,
}: DraftForOptions) {
  if (draft) return draft.value
  if (profile) return profileToInput(profile)
  if (!source) return null
  return blankProfile(source, fallbackContent)
}

export function newDraft({
  fallbackContent,
  profile,
  profiles,
  source,
}: NewDraftOptions): DraftState {
  const content = profile?.content || fallbackContent
  const nextNumber = profiles.length + 1
  return {
    key: newProfileID,
    value: { ...blankProfile(source, content), name: `配置 ${nextNumber}` },
  }
}

export function sourceLabel(source: ConfigSource, sources: ConfigSource[]) {
  const sameApplicationCount = sources.filter(
    (item) => item.agent_name === source.agent_name
  ).length
  if (sameApplicationCount < 2) return source.agent_name
  return `${source.agent_name}：${fileName(source.path)}`
}

export function profileSelectItems(
  profiles: Profile[],
  source: ConfigSource | null
) {
  const profileItems = profiles.map((profile) => ({
    label: profileLabel(profile, profiles),
    value: profile.id,
  }))
  if (!source) return profileItems
  return [...profileItems, { label: "新增配置", value: newProfileID }]
}

export function profileLabel(profile: Profile, profiles: Profile[]) {
  const index = profiles.findIndex((item) => item.id === profile.id)
  const number = index >= 0 ? index + 1 : profiles.length + 1
  return `配置 ${number}：${profile.name}`
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

function fileName(path: string) {
  return path.split(/[\\/]/).slice(-1)[0] || path
}
