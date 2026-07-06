import { useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

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

export function PromptWorkspace() {
  const [filters, setFilters] = useState<PromptListFilters>(defaultFilters)
  const [viewMode, setViewMode] = usePromptViewMode()
  const [selectedID, setSelectedID] = useState<string | null>(null)
  const [mode, setMode] = useState<PromptPanelMode>("empty")
  const [draft, setDraft] = useState<PromptDraft>(emptyDraft)
  const [savedDraft, setSavedDraft] = useState<PromptDraft>(emptyDraft)
  const [pendingDelete, setPendingDelete] = useState<Prompt | null>(null)
  const promptsQuery = usePrompts(filters)
  const tagsQuery = useTags()
  const mutations = usePromptMutations()
  const prompts = promptsQuery.data?.prompts ?? emptyPrompts
  const selectedPrompt = useSelectedPrompt(prompts, selectedID)
  const dirty = !draftsEqual(draft, savedDraft)
  const pending = mutations.create.isPending || mutations.update.isPending

  useUnsavedPromptGuard(dirty)
  useSelectionRepair(prompts, selectedID, setSelectedID, setMode)

  return (
    <section className="mx-auto flex w-full max-w-[1280px] flex-col gap-4">
      <PromptToolbar
        filters={filters}
        tags={tagsQuery.data?.tags ?? []}
        viewMode={viewMode}
        onCreate={() =>
          openCreate(dirty, setMode, setSelectedID, setDraft, setSavedDraft)
        }
        onExport={() =>
          runAction(handleExport(mutations.exportData.mutateAsync))
        }
        onImport={(file) =>
          runAction(handleImport(file, mutations.importData.mutateAsync))
        }
        onFiltersChange={setFilters}
        onViewModeChange={setViewMode}
      />
      <PromptBrowser
        prompts={prompts}
        selectedID={selectedID}
        viewMode={viewMode}
        loading={promptsQuery.isLoading}
        onCopy={(prompt) =>
          runAction(handleCopy(prompt, mutations.copy.mutateAsync))
        }
        onDelete={setPendingDelete}
        onSelect={(prompt) =>
          selectPrompt(
            prompt,
            dirty,
            setSelectedID,
            setMode,
            setDraft,
            setSavedDraft
          )
        }
        onToggleFavorite={(prompt) =>
          runAction(toggleFavorite(prompt, mutations.update.mutateAsync))
        }
      />
      <PromptEditorDialog
        dirty={dirty}
        draft={draft}
        mode={mode}
        open={mode !== "empty"}
        pending={pending}
        prompt={selectedPrompt}
        tags={tagsQuery.data?.tags ?? []}
        onClose={() =>
          closePromptDialog(dirty, setMode, setDraft, setSavedDraft)
        }
        onCopy={(prompt) =>
          runAction(handleCopy(prompt, mutations.copy.mutateAsync))
        }
        onDelete={setPendingDelete}
        onDraftChange={setDraft}
        onEdit={() =>
          startEdit(selectedPrompt, setMode, setDraft, setSavedDraft)
        }
        onOpenChange={(open) =>
          !open && closePromptDialog(dirty, setMode, setDraft, setSavedDraft)
        }
        onSave={() =>
          runAction(
            savePrompt(
              mode,
              selectedID,
              draft,
              mutations.create.mutateAsync,
              mutations.update.mutateAsync,
              setSelectedID,
              setMode,
              setDraft,
              setSavedDraft
            )
          )
        }
        onToggleFavorite={(prompt) =>
          runAction(toggleFavorite(prompt, mutations.update.mutateAsync))
        }
      />
      <PromptDeleteDialog
        prompt={pendingDelete}
        pending={mutations.remove.isPending}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        onConfirm={() =>
          runAction(
            confirmDelete(
              pendingDelete,
              mutations.remove.mutateAsync,
              setPendingDelete,
              selectedID,
              setSelectedID,
              setMode
            )
          )
        }
      />
    </section>
  )
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

function useSelectionRepair(
  prompts: Prompt[],
  selectedID: string | null,
  setSelectedID: (id: string | null) => void,
  setMode: (mode: PromptPanelMode) => void
) {
  useEffect(() => {
    if (!selectedID || prompts.some((prompt) => prompt.id === selectedID))
      return
    setSelectedID(null)
    setMode("empty")
  }, [prompts, selectedID, setMode, setSelectedID])
}

function confirmDiscard(dirty: boolean) {
  return !dirty || window.confirm("有未儲存變更，確定離開？")
}

function closePromptDialog(
  dirty: boolean,
  setMode: (mode: PromptPanelMode) => void,
  setDraft: (draft: PromptDraft) => void,
  setSavedDraft: (draft: PromptDraft) => void
) {
  if (!confirmDiscard(dirty)) return
  setDraft(emptyDraft)
  setSavedDraft(emptyDraft)
  setMode("empty")
}

function openCreate(
  dirty: boolean,
  setMode: (mode: PromptPanelMode) => void,
  setSelectedID: (id: string | null) => void,
  setDraft: (draft: PromptDraft) => void,
  setSavedDraft: (draft: PromptDraft) => void
) {
  if (!confirmDiscard(dirty)) return
  setSelectedID(null)
  setDraft(emptyDraft)
  setSavedDraft(emptyDraft)
  setMode("create")
}

function selectPrompt(
  prompt: Prompt,
  dirty: boolean,
  setSelectedID: (id: string) => void,
  setMode: (mode: PromptPanelMode) => void,
  setDraft: (draft: PromptDraft) => void,
  setSavedDraft: (draft: PromptDraft) => void
) {
  if (!confirmDiscard(dirty)) return
  const nextDraft = draftFromPrompt(prompt)
  setSelectedID(prompt.id)
  setDraft(nextDraft)
  setSavedDraft(nextDraft)
  setMode("view")
}

function startEdit(
  prompt: Prompt | null,
  setMode: (mode: PromptPanelMode) => void,
  setDraft: (draft: PromptDraft) => void,
  setSavedDraft: (draft: PromptDraft) => void
) {
  if (!prompt) return
  const nextDraft = draftFromPrompt(prompt)
  setDraft(nextDraft)
  setSavedDraft(nextDraft)
  setMode("edit")
}

async function savePrompt(
  mode: PromptPanelMode,
  selectedID: string | null,
  draft: PromptDraft,
  create: (input: SavePromptInput) => Promise<Prompt>,
  update: (input: { id: string; input: SavePromptInput }) => Promise<Prompt>,
  setSelectedID: (id: string) => void,
  setMode: (mode: PromptPanelMode) => void,
  setDraft: (draft: PromptDraft) => void,
  setSavedDraft: (draft: PromptDraft) => void
) {
  const saved =
    mode === "create"
      ? await create(saveInputFromDraft(draft))
      : await update({ id: selectedID ?? "", input: saveInputFromDraft(draft) })
  const nextDraft = draftFromPrompt(saved)
  setSelectedID(saved.id)
  setDraft(nextDraft)
  setSavedDraft(nextDraft)
  setMode("view")
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

async function confirmDelete(
  prompt: Prompt | null,
  remove: (id: string) => Promise<void>,
  setPendingDelete: (prompt: Prompt | null) => void,
  selectedID: string | null,
  setSelectedID: (id: string | null) => void,
  setMode: (mode: PromptPanelMode) => void
) {
  if (!prompt) return
  await remove(prompt.id)
  setPendingDelete(null)
  if (selectedID === prompt.id) {
    setSelectedID(null)
    setMode("empty")
  }
  toast.success("提示詞已刪除。")
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

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) =>
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  )
}
