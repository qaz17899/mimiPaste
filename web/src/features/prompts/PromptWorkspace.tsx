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
import { PromptHistoryDialog } from "@/features/prompts/PromptHistoryDialog"
import { PromptImportDialog } from "@/features/prompts/PromptImportDialog"
import {
  PromptToolbar,
  type PromptViewMode,
} from "@/features/prompts/PromptToolbar"
import { PromptVariableDialog } from "@/features/prompts/PromptVariableDialog"
import { actionErrorMessage } from "@/lib/errors/display-policy"
import {
  usePromptMutations,
  usePromptVersions,
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
  PromptImportPreview,
  PromptListFilters,
  PromptTag,
  PromptVersion,
  SavePromptInput,
} from "@/features/prompts/prompt-types"
import {
  parsePromptVariables,
  renderPromptTemplate,
  type PromptVariableValues,
} from "@/features/prompts/prompt-variables"

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
  copying: boolean
  dirty: boolean
  discardIntent: PromptIntent | null
  draft: PromptDraft
  filters: PromptListFilters
  historyLoading: boolean
  historyPending: boolean
  historyPrompt: Prompt | null
  historyVersions: PromptVersion[]
  importDialogOpen: boolean
  importError: string
  importPending: boolean
  importPreview: PromptImportPreview | null
  loading: boolean
  mode: PromptPanelMode
  pending: boolean
  pendingDelete: Prompt | null
  prompts: Prompt[]
  selectedID: string | null
  selectedPrompt: Prompt | null
  tags: PromptTag[]
  variablePrompt: Prompt | null
  viewMode: PromptViewMode
}

type PromptWorkspaceActions = {
  cancelVariableCopy: () => void
  cancelImport: () => void
  closeHistory: () => void
  closeEditor: () => void
  confirmDelete: () => void
  confirmDiscard: () => void
  confirmVariableCopy: (prompt: Prompt, values: PromptVariableValues) => void
  copy: (prompt: Prompt) => void
  create: () => void
  edit: () => void
  exportData: () => void
  importData: (file: File) => void
  openHistory: (prompt: Prompt) => void
  rollbackVersion: (version: PromptVersion) => void
  confirmImport: () => void
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
      <PromptHistoryLayer actions={actions} model={model} />
      <PromptImportLayer actions={actions} model={model} />
      <PromptVariableLayer actions={actions} model={model} />
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
      onHistory={actions.openHistory}
      onOpenChange={(open) => !open && actions.closeEditor()}
      onSave={actions.save}
      onToggleFavorite={actions.toggleFavorite}
    />
  )
}

function PromptImportLayer({ actions, model }: PromptWorkspaceController) {
  return (
    <PromptImportDialog
      error={model.importError}
      open={model.importDialogOpen}
      pending={model.importPending}
      preview={model.importPreview}
      onCancel={actions.cancelImport}
      onConfirm={actions.confirmImport}
    />
  )
}

function PromptHistoryLayer({ actions, model }: PromptWorkspaceController) {
  return (
    <PromptHistoryDialog
      loading={model.historyLoading}
      open={model.historyPrompt !== null}
      pending={model.historyPending}
      prompt={model.historyPrompt}
      versions={model.historyVersions}
      onClose={actions.closeHistory}
      onRollback={actions.rollbackVersion}
    />
  )
}

function PromptVariableLayer({ actions, model }: PromptWorkspaceController) {
  return (
    <PromptVariableDialog
      open={model.variablePrompt !== null}
      pending={model.copying}
      prompt={model.variablePrompt}
      onCancel={actions.cancelVariableCopy}
      onConfirm={actions.confirmVariableCopy}
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
  const data = usePromptData(
    state.filters,
    state.selectedID,
    state.historyPrompt?.id ?? null
  )
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
  const [historyPrompt, setHistoryPrompt] = useState<Prompt | null>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importEnvelope, setImportEnvelope] =
    useState<PromptImportEnvelope | null>(null)
  const [importError, setImportError] = useState("")
  const [importPreview, setImportPreview] =
    useState<PromptImportPreview | null>(null)
  const [variablePrompt, setVariablePrompt] = useState<Prompt | null>(null)

  return {
    discardIntent,
    draft,
    filters,
    historyPrompt,
    importDialogOpen,
    importEnvelope,
    importError,
    importPreview,
    mode,
    pendingDelete,
    savedDraft,
    selectedID,
    setDiscardIntent,
    setDraft,
    setFilters,
    setHistoryPrompt,
    setImportDialogOpen,
    setImportEnvelope,
    setImportError,
    setImportPreview,
    setMode,
    setPendingDelete,
    setSavedDraft,
    setSelectedID,
    setVariablePrompt,
    setViewMode,
    variablePrompt,
    viewMode,
  }
}

function usePromptData(
  filters: PromptListFilters,
  selectedID: string | null,
  historyPromptID: string | null
) {
  const promptsQuery = usePrompts(filters)
  const tagsQuery = useTags()
  const versionsQuery = usePromptVersions(historyPromptID)
  const mutations = usePromptMutations()
  const prompts = promptsQuery.data?.prompts ?? emptyPrompts
  const selectedPrompt = useSelectedPrompt(prompts, selectedID)
  const pending = mutations.create.isPending || mutations.update.isPending
  const copying = mutations.copy.isPending
  const historyPending = mutations.rollback.isPending
  const importPending =
    mutations.previewImport.isPending || mutations.importData.isPending

  return {
    copying,
    historyLoading: versionsQuery.isLoading,
    historyPending,
    historyVersions: versionsQuery.data?.versions ?? [],
    importPending,
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
    copying: data.copying,
    dirty,
    discardIntent: state.discardIntent,
    draft: state.draft,
    filters: state.filters,
    historyLoading: data.historyLoading,
    historyPending: data.historyPending,
    historyPrompt: state.historyPrompt,
    historyVersions: data.historyVersions,
    importDialogOpen: state.importDialogOpen,
    importError: state.importError,
    importPending: data.importPending,
    importPreview: state.importPreview,
    loading: data.loading,
    mode: state.mode,
    pending: data.pending,
    pendingDelete: state.pendingDelete,
    prompts: data.prompts,
    selectedID: state.selectedID,
    selectedPrompt: data.selectedPrompt,
    tags: data.tags,
    variablePrompt: state.variablePrompt,
    viewMode: state.viewMode,
  }
}

function usePromptActions(deps: PromptActionDeps): PromptWorkspaceActions {
  const { data, state } = deps

  return {
    cancelImport: () => clearImportState(state),
    cancelVariableCopy: () => state.setVariablePrompt(null),
    closeHistory: () => state.setHistoryPrompt(null),
    closeEditor: () => requestPromptIntent({ kind: "close" }, deps),
    confirmDelete: () => runAction(confirmDeletePrompt(deps)),
    confirmDiscard: () => confirmPromptDiscard(deps),
    confirmVariableCopy: (prompt, values) =>
      runAction(handleVariableCopy(prompt, values, deps)),
    copy: (prompt) => runAction(copyPrompt(prompt, deps)),
    create: () => requestPromptIntent({ kind: "create" }, deps),
    edit: () => startEdit(data.selectedPrompt, state),
    exportData: () =>
      runAction(handleExport(data.mutations.exportData.mutateAsync)),
    importData: (file) => runAction(previewImport(file, deps)),
    openHistory: (prompt) => state.setHistoryPrompt(prompt),
    rollbackVersion: (version) => runAction(rollbackPromptVersion(version, deps)),
    confirmImport: () => runAction(confirmImport(deps)),
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

async function rollbackPromptVersion(
  version: PromptVersion,
  { data, state }: PromptActionDeps
) {
  const prompt = state.historyPrompt
  if (!prompt) return
  const restored = await data.mutations.rollback.mutateAsync({
    id: prompt.id,
    versionID: version.id,
  })
  if (state.selectedID === restored.id) selectPrompt(restored, state)
  state.setHistoryPrompt(null)
  toast.success("提示詞已還原。")
}

async function copyPrompt(prompt: Prompt, deps: PromptActionDeps) {
  if (parsePromptVariables(prompt.content).length > 0) {
    deps.state.setVariablePrompt(prompt)
    return
  }
  await handleCopy(prompt, prompt.content, deps.data.mutations.copy.mutateAsync)
}

async function handleVariableCopy(
  prompt: Prompt,
  values: PromptVariableValues,
  deps: PromptActionDeps
) {
  const content = renderPromptTemplate(prompt.content, values)
  await handleCopy(prompt, content, deps.data.mutations.copy.mutateAsync)
  deps.state.setVariablePrompt(null)
}

async function handleCopy(
  prompt: Prompt,
  content: string,
  recordCopy: (id: string) => Promise<Prompt>
) {
  await copyText(content)
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

async function previewImport(file: File, { data, state }: PromptActionDeps) {
  state.setImportDialogOpen(true)
  state.setImportEnvelope(null)
  state.setImportPreview(null)
  state.setImportError("")
  const envelope = await readImportEnvelope(file)
  if (!envelope) {
    state.setImportError("檔案不是有效的 JSON。")
    return
  }
  const preview = await data.mutations.previewImport.mutateAsync(envelope)
  state.setImportEnvelope(envelope)
  state.setImportPreview(preview)
}

async function confirmImport({ data, state }: PromptActionDeps) {
  if (!state.importEnvelope) return
  await data.mutations.importData.mutateAsync(state.importEnvelope)
  clearImportState(state)
  toast.success("匯入完成。")
}

async function readImportEnvelope(
  file: File
): Promise<PromptImportEnvelope | null> {
  try {
    return JSON.parse(await file.text()) as PromptImportEnvelope
  } catch {
    return null
  }
}

function clearImportState(state: PromptState) {
  state.setImportDialogOpen(false)
  state.setImportEnvelope(null)
  state.setImportError("")
  state.setImportPreview(null)
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
  action.catch((error: unknown) => toast.error(actionErrorMessage(error)))
}
