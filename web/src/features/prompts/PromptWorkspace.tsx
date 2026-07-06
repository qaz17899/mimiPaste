import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { copyText } from "@/lib/clipboard/clipboard"

import { PromptBrowser } from "@/features/prompts/PromptBrowser"
import { PromptDeleteDialog } from "@/features/prompts/PromptDeleteDialog"
import {
  PromptEditorDialog,
  type PromptPanelMode,
} from "@/features/prompts/PromptEditorDialog"
import {
  PromptToolbar,
  type PromptViewMode,
} from "@/features/prompts/PromptToolbar"
import {
  usePromptMutations,
  usePrompts,
  useTags,
} from "@/features/prompts/prompt-queries"
import {
  draftFromPrompt,
  draftsEqual,
  emptyDraft,
  saveInputFromDraft,
} from "@/features/prompts/prompt-state"
import type {
  Prompt,
  PromptDraft,
  PromptImportEnvelope,
  PromptListFilters,
  PromptTag,
  SavePromptInput,
} from "@/features/prompts/prompt-types"

const VIEW_MODE_KEY = "mimipaste.promptViewMode"
const emptyPrompts: Prompt[] = []
const defaultFilters: PromptListFilters = {
  query: "",
  tag: "",
  favoriteOnly: false,
  sort: "updated",
}

type PromptIntent =
  { kind: "create" } | { kind: "select"; prompt: Prompt } | { kind: "close" }

type PromptWorkspaceModel = {
  dirty: boolean
  discardIntent: PromptIntent | null
  draft: PromptDraft
  filters: PromptListFilters
  loading: boolean
  mode: PromptPanelMode
  pending: boolean
  pendingDelete: Prompt | null
  prompts: Prompt[]
  selectedID: string | null
  selectedPrompt: Prompt | null
  tags: PromptTag[]
  viewMode: PromptViewMode
}

type PromptWorkspaceActions = {
  closeEditor: () => void
  confirmDelete: () => void
  confirmDiscard: () => void
  copy: (prompt: Prompt) => void
  create: () => void
  edit: () => void
  exportData: () => void
  importData: (file: File) => void
  save: () => void
  select: (prompt: Prompt) => void
  setDiscardIntent: (intent: PromptIntent | null) => void
  setDraft: (draft: PromptDraft) => void
  setFilters: (filters: PromptListFilters) => void
  setPendingDelete: (prompt: Prompt | null) => void
  setViewMode: (mode: PromptViewMode) => void
  toggleFavorite: (prompt: Prompt) => void
}

type PromptWorkspaceController = {
  actions: PromptWorkspaceActions
  model: PromptWorkspaceModel
}

type PromptState = ReturnType<typeof usePromptState>
type PromptData = ReturnType<typeof usePromptData>

type PromptActionDeps = {
  data: PromptData
  dirty: boolean
  state: PromptState
}

export function PromptWorkspace() {
  return <PromptWorkspaceView {...usePromptWorkspace()} />
}

function PromptWorkspaceView({ actions, model }: PromptWorkspaceController) {
  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <PromptToolbar
        filters={model.filters}
        tags={model.tags}
        viewMode={model.viewMode}
        onCreate={actions.create}
        onExport={actions.exportData}
        onImport={actions.importData}
        onFiltersChange={actions.setFilters}
        onViewModeChange={actions.setViewMode}
      />
      <PromptBrowserSection actions={actions} model={model} />
      <PromptEditorLayer actions={actions} model={model} />
      <PromptDeleteLayer actions={actions} model={model} />
      <PromptDiscardDialog
        open={model.discardIntent !== null}
        onConfirm={actions.confirmDiscard}
        onOpenChange={(open) => !open && actions.setDiscardIntent(null)}
      />
    </section>
  )
}

function PromptBrowserSection({ actions, model }: PromptWorkspaceController) {
  return (
    <PromptBrowser
      prompts={model.prompts}
      selectedID={model.selectedID}
      viewMode={model.viewMode}
      loading={model.loading}
      onCopy={actions.copy}
      onDelete={actions.setPendingDelete}
      onSelect={actions.select}
      onToggleFavorite={actions.toggleFavorite}
    />
  )
}

function PromptEditorLayer({ actions, model }: PromptWorkspaceController) {
  return (
    <PromptEditorDialog
      dirty={model.dirty}
      draft={model.draft}
      mode={model.mode}
      open={model.mode !== "empty"}
      pending={model.pending}
      prompt={model.selectedPrompt}
      tags={model.tags}
      onClose={actions.closeEditor}
      onCopy={actions.copy}
      onDelete={actions.setPendingDelete}
      onDraftChange={actions.setDraft}
      onEdit={actions.edit}
      onOpenChange={(open) => !open && actions.closeEditor()}
      onSave={actions.save}
      onToggleFavorite={actions.toggleFavorite}
    />
  )
}

function PromptDeleteLayer({ actions, model }: PromptWorkspaceController) {
  return (
    <PromptDeleteDialog
      prompt={model.pendingDelete}
      pending={model.pending}
      onOpenChange={(open) => !open && actions.setPendingDelete(null)}
      onConfirm={actions.confirmDelete}
    />
  )
}

function usePromptWorkspace(): PromptWorkspaceController {
  const state = usePromptState()
  const data = usePromptData(state.filters, state.selectedID)
  const dirty = !draftsEqual(state.draft, state.savedDraft)

  useUnsavedPromptGuard(dirty)
  useSelectionRepair(data.prompts, state)

  return {
    actions: usePromptActions({ data, dirty, state }),
    model: promptModel(state, data, dirty),
  }
}

function usePromptState() {
  const [filters, setFilters] = useState<PromptListFilters>(defaultFilters)
  const [viewMode, setViewMode] = usePromptViewMode()
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [mode, setMode] = useState<PromptPanelMode>("empty")
  const [draft, setDraft] = useState<PromptDraft>(emptyDraft)
  const [savedDraft, setSavedDraft] = useState<PromptDraft>(emptyDraft)
  const [pendingDelete, setPendingDelete] = useState<Prompt | null>(null)
  const [discardIntent, setDiscardIntent] = useState<PromptIntent | null>(null)

  return {
    discardIntent,
    draft,
    filters,
    mode,
    pendingDelete,
    savedDraft,
    selectedID,
    setDiscardIntent,
    setDraft,
    setFilters,
    setMode,
    setPendingDelete,
    setSavedDraft,
    setSelectedID,
    setViewMode,
    viewMode,
  }
}

function usePromptData(filters: PromptListFilters, selectedID: string | null) {
  const promptsQuery = usePrompts(filters)
  const tagsQuery = useTags()
  const mutations = usePromptMutations()
  const prompts = promptsQuery.data?.prompts ?? emptyPrompts
  const selectedPrompt = useSelectedPrompt(prompts, selectedID)
  const pending = mutations.create.isPending || mutations.update.isPending

  return {
    loading: promptsQuery.isLoading,
    mutations,
    pending,
    prompts,
    selectedPrompt,
    tags: tagsQuery.data?.tags ?? [],
  }
}

function promptModel(
  state: PromptState,
  data: PromptData,
  dirty: boolean
): PromptWorkspaceModel {
  return {
    dirty,
    discardIntent: state.discardIntent,
    draft: state.draft,
    filters: state.filters,
    loading: data.loading,
    mode: state.mode,
    pending: data.pending,
    pendingDelete: state.pendingDelete,
    prompts: data.prompts,
    selectedID: state.selectedID,
    selectedPrompt: data.selectedPrompt,
    tags: data.tags,
    viewMode: state.viewMode,
  }
}

function usePromptActions(deps: PromptActionDeps): PromptWorkspaceActions {
  const { data, state } = deps

  return {
    closeEditor: () => requestPromptIntent({ kind: "close" }, deps),
    confirmDelete: () => runAction(confirmDeletePrompt(deps)),
    confirmDiscard: () => confirmPromptDiscard(deps),
    copy: (prompt) =>
      runAction(handleCopy(prompt, data.mutations.copy.mutateAsync)),
    create: () => requestPromptIntent({ kind: "create" }, deps),
    edit: () => startEdit(data.selectedPrompt, state),
    exportData: () =>
      runAction(handleExport(data.mutations.exportData.mutateAsync)),
    importData: (file) =>
      runAction(handleImport(file, data.mutations.importData.mutateAsync)),
    save: () => runAction(savePrompt(deps)),
    select: (prompt) => requestPromptIntent({ kind: "select", prompt }, deps),
    setDiscardIntent: state.setDiscardIntent,
    setDraft: state.setDraft,
    setFilters: state.setFilters,
    setPendingDelete: state.setPendingDelete,
    setViewMode: state.setViewMode,
    toggleFavorite: (prompt) =>
      runAction(toggleFavorite(prompt, data.mutations.update.mutateAsync)),
  }
}

function useSelectedPrompt(prompts: Prompt[], selectedID: string | null) {
  return useMemo(
    () => prompts.find((prompt) => prompt.id === selectedID) ?? null,
    [prompts, selectedID]
  )
}

function usePromptViewMode() {
  const [viewMode, setViewModeState] = useState<PromptViewMode>(readViewMode)
  const setViewMode = (nextMode: PromptViewMode) => {
    localStorage.setItem(VIEW_MODE_KEY, nextMode)
    setViewModeState(nextMode)
  }
  return [viewMode, setViewMode] as const
}

function readViewMode(): PromptViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "cards"
}

function useUnsavedPromptGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ""
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [dirty])
}

function useSelectionRepair(prompts: Prompt[], state: PromptState) {
  useEffect(() => {
    if (!state.selectedID) return
    if (prompts.some((prompt) => prompt.id === state.selectedID)) return
    state.setSelectedID(null)
    state.setMode("empty")
  }, [prompts, state])
}

function requestPromptIntent(intent: PromptIntent, deps: PromptActionDeps) {
  if (deps.dirty) {
    deps.state.setDiscardIntent(intent)
    return
  }
  executePromptIntent(intent, deps.state)
}

function confirmPromptDiscard(deps: PromptActionDeps) {
  const intent = deps.state.discardIntent
  if (!intent) return
  executePromptIntent(intent, deps.state)
  deps.state.setDiscardIntent(null)
}

function executePromptIntent(intent: PromptIntent, state: PromptState) {
  if (intent.kind === "create") return openCreate(state)
  if (intent.kind === "close") return closePromptDialog(state)
  selectPrompt(intent.prompt, state)
}

function closePromptDialog(state: PromptState) {
  state.setDraft(emptyDraft)
  state.setSavedDraft(emptyDraft)
  state.setMode("empty")
}

function openCreate(state: PromptState) {
  state.setSelectedID(null)
  state.setDraft(emptyDraft)
  state.setSavedDraft(emptyDraft)
  state.setMode("create")
}

function selectPrompt(prompt: Prompt, state: PromptState) {
  const nextDraft = draftFromPrompt(prompt)
  state.setSelectedID(prompt.id)
  state.setDraft(nextDraft)
  state.setSavedDraft(nextDraft)
  state.setMode("view")
}

function startEdit(prompt: Prompt | null, state: PromptState) {
  if (!prompt) return
  const nextDraft = draftFromPrompt(prompt)
  state.setDraft(nextDraft)
  state.setSavedDraft(nextDraft)
  state.setMode("edit")
}

async function savePrompt({ data, state }: PromptActionDeps) {
  const input = saveInputFromDraft(state.draft)
  const saved =
    state.mode === "create"
      ? await data.mutations.create.mutateAsync(input)
      : await data.mutations.update.mutateAsync({
          id: state.selectedID ?? "",
          input,
        })
  const nextDraft = draftFromPrompt(saved)
  state.setSelectedID(saved.id)
  state.setDraft(nextDraft)
  state.setSavedDraft(nextDraft)
  state.setMode("view")
  toast.success("提示詞已儲存。")
}

async function handleCopy(
  prompt: Prompt,
  recordCopy: (id: string) => Promise<Prompt>
) {
  await copyText(prompt.content)
  await recordCopy(prompt.id)
  toast.success("已複製。")
}

async function toggleFavorite(
  prompt: Prompt,
  update: (input: { id: string; input: SavePromptInput }) => Promise<Prompt>
) {
  const input = {
    ...saveInputFromDraft(draftFromPrompt(prompt)),
    favorite: !prompt.favorite,
  }
  await update({ id: prompt.id, input })
}

async function confirmDeletePrompt({ data, state }: PromptActionDeps) {
  const prompt = state.pendingDelete
  if (!prompt) return
  await data.mutations.remove.mutateAsync(prompt.id)
  state.setPendingDelete(null)
  clearDeletedSelection(prompt, state)
  toast.success("提示詞已刪除。")
}

function clearDeletedSelection(prompt: Prompt, state: PromptState) {
  if (state.selectedID !== prompt.id) return
  state.setSelectedID(null)
  state.setMode("empty")
}

async function handleExport(exportData: () => Promise<unknown>) {
  const data = await exportData()
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  )
  downloadURL(url, "mimipaste-prompts.json")
  URL.revokeObjectURL(url)
}

async function handleImport(
  file: File,
  importData: (input: PromptImportEnvelope) => Promise<unknown>
) {
  await importData(JSON.parse(await file.text()) as PromptImportEnvelope)
  toast.success("匯入完成。")
}

function downloadURL(url: string, filename: string) {
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
}

function PromptDiscardDialog({
  open,
  onConfirm,
  onOpenChange,
}: {
  open: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>放棄未儲存變更？</AlertDialogTitle>
          <AlertDialogDescription>
            目前提示詞還沒儲存，繼續操作會放棄這次修改。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            放棄變更
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) =>
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  )
}
