import {
  Check,
  Eye,
  EyeOff,
  FileCog,
  GitCompare,
  Play,
  Plus,
  Save,
} from "lucide-react"

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

import type { ConfigSource } from "@/features/agents/agent-types"
import {
  newProfileID,
  profileLabel,
  profileSelectItems,
  sourceLabel,
} from "@/features/agents/config-workspace-state"
import {
  useConfigWorkspace,
  type ConfigWorkspaceModel,
} from "@/features/agents/use-config-workspace"
import { SourceOnboarding } from "@/features/agents/SourceOnboarding"
import type {
  Profile,
  ProfileSaveInput,
} from "@/features/profiles/profile-types"

export function AgentsWorkspace() {
  const model = useConfigWorkspace()
  if (model.sources.length === 0) {
    return (
      <section className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <NoConfigFiles />
        <SourceOnboarding onCreated={(source) => model.selectSource(source.id)} />
      </section>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <ConfigSwitcher model={model} />
      <div className="flex justify-end">
        <SourceOnboarding
          compact
          onCreated={(source) => model.selectSource(source.id)}
        />
      </div>
      <ApplyPreviewPanel model={model} />
      <ConfigEditor model={model} />
    </section>
  )
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

function ApplyPreviewPanel({ model }: { model: ConfigWorkspaceModel }) {
  if (!model.applyPreview) return null
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex min-w-0 items-center gap-2">
          <span className="min-w-0 truncate">差異預覽</span>
          <Badge variant={model.applyPreview.changed ? "secondary" : "outline"}>
            {model.applyPreview.changed ? "有變更" : "沒有變更"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground">
          {model.applyPreview.diff}
        </pre>
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
        disabled={
          !model.draft ||
          !model.dirty ||
          model.pending ||
          model.draft.content_masked
        }
        onClick={model.save}
      >
        <Save data-icon="inline-start" />
        儲存
      </Button>
      <Button
        variant="outline"
        disabled={!model.selected || model.dirty || model.pending}
        onClick={model.previewApply}
      >
        <GitCompare data-icon="inline-start" />
        預覽差異
      </Button>
      <Button
        disabled={!model.selected || !model.applyPreviewReady || model.pending}
        onClick={model.apply}
      >
        <Play data-icon="inline-start" />
        套用配置
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
        canToggleContentReveal={model.canToggleContentReveal}
        contentMasked={Boolean(model.draft?.content_masked)}
        onHideContent={model.hideContent}
        onRevealContent={model.revealContent}
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
  canToggleContentReveal,
  contentMasked,
  onHideContent,
  onRevealContent,
  title,
}: {
  active: boolean
  canToggleContentReveal: boolean
  contentMasked: boolean
  onHideContent: () => void
  onRevealContent: () => void
  title: string
}) {
  return (
    <CardHeader className="flex flex-row items-center justify-between gap-3">
      <CardTitle className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 truncate">{title}</span>
        {active ? (
          <Badge variant="secondary">
            <Check data-icon="inline-start" />
            使用中
          </Badge>
        ) : null}
      </CardTitle>
      {canToggleContentReveal ? (
        <Button
          size="sm"
          variant="outline"
          onClick={contentMasked ? onRevealContent : onHideContent}
        >
          {contentMasked ? (
            <Eye data-icon="inline-start" />
          ) : (
            <EyeOff data-icon="inline-start" />
          )}
          {contentMasked ? "顯示完整內容" : "隱藏敏感內容"}
        </Button>
      ) : null}
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
