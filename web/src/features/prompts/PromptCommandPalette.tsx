import { useEffect, useMemo, useState } from "react"
import { Search } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { PromptVariableDialog } from "@/features/prompts/PromptVariableDialog"
import { usePromptMutations, usePrompts } from "@/features/prompts/prompt-queries"
import type {
  Prompt,
  PromptListFilters,
} from "@/features/prompts/prompt-types"
import {
  parsePromptVariables,
  renderPromptTemplate,
  type PromptVariableValues,
} from "@/features/prompts/prompt-variables"
import { copyText } from "@/lib/clipboard/clipboard"
import { actionErrorMessage } from "@/lib/errors/display-policy"

export function PromptCommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [variablePrompt, setVariablePrompt] = useState<Prompt | null>(null)
  const filters = useCommandFilters(query)
  const promptsQuery = usePrompts(filters)
  const mutations = usePromptMutations()
  const prompts = promptsQuery.data?.prompts ?? []

  useCommandShortcut(() => setOpen((value) => !value))

  return (
    <PromptCommandPaletteView
      copyPrompt={(prompt) =>
        runAction(
          copyPromptFromPalette(
            prompt,
            setOpen,
            setVariablePrompt,
            mutations.copy.mutateAsync
          )
        )
      }
      copyWithVariables={(prompt, values) =>
        runAction(
          copyPromptWithVariables(
            prompt,
            values,
            setVariablePrompt,
            mutations.copy.mutateAsync
          )
        )
      }
      open={open}
      prompts={prompts}
      query={query}
      variablePrompt={variablePrompt}
      variablePending={mutations.copy.isPending}
      onOpenChange={setOpen}
      onQueryChange={setQuery}
      onVariableCancel={() => setVariablePrompt(null)}
    />
  )
}

function PromptCommandPaletteView({
  copyPrompt,
  copyWithVariables,
  open,
  prompts,
  query,
  variablePending,
  variablePrompt,
  onOpenChange,
  onQueryChange,
  onVariableCancel,
}: {
  copyPrompt: (prompt: Prompt) => void
  copyWithVariables: (prompt: Prompt, values: PromptVariableValues) => void
  open: boolean
  prompts: Prompt[]
  query: string
  variablePending: boolean
  variablePrompt: Prompt | null
  onOpenChange: (open: boolean) => void
  onQueryChange: (query: string) => void
  onVariableCancel: () => void
}) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(true)}>
        <Search data-icon="inline-start" />
        搜尋
      </Button>
      <PromptCommandDialog
        open={open}
        prompts={prompts}
        query={query}
        onCopy={copyPrompt}
        onOpenChange={onOpenChange}
        onQueryChange={onQueryChange}
      />
      <PromptVariableDialog
        open={variablePrompt !== null}
        pending={variablePending}
        prompt={variablePrompt}
        onCancel={onVariableCancel}
        onConfirm={copyWithVariables}
      />
    </>
  )
}

function PromptCommandDialog({
  open,
  prompts,
  query,
  onCopy,
  onOpenChange,
  onQueryChange,
}: {
  open: boolean
  prompts: Prompt[]
  query: string
  onCopy: (prompt: Prompt) => void
  onOpenChange: (open: boolean) => void
  onQueryChange: (query: string) => void
}) {
  return (
    <CommandDialog
      title="搜尋提示詞"
      description="搜尋並複製提示詞。"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={onQueryChange}
          placeholder="搜尋提示詞..."
        />
        <CommandList>
          <CommandEmpty>查無提示詞。</CommandEmpty>
          <CommandPromptItems prompts={prompts} onCopy={onCopy} />
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

function CommandPromptItems({
  prompts,
  onCopy,
}: {
  prompts: Prompt[]
  onCopy: (prompt: Prompt) => void
}) {
  return (
    <CommandGroup heading="提示詞">
      {prompts.map((prompt) => (
        <CommandItem
          key={prompt.id}
          value={`${prompt.title} ${prompt.description}`}
          onSelect={() => onCopy(prompt)}
        >
          <span className="truncate">{prompt.title}</span>
          <CommandShortcut>複製</CommandShortcut>
        </CommandItem>
      ))}
    </CommandGroup>
  )
}

function useCommandFilters(query: string): PromptListFilters {
  return useMemo(
    () => ({
      favoriteOnly: false,
      query,
      sort: "updated",
      tag: "",
    }),
    [query]
  )
}

function useCommandShortcut(onToggle: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isCommandPaletteShortcut(event)) return
      event.preventDefault()
      onToggle()
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [onToggle])
}

function isCommandPaletteShortcut(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k"
}

async function copyPromptFromPalette(
  prompt: Prompt,
  setOpen: (open: boolean) => void,
  setVariablePrompt: (prompt: Prompt | null) => void,
  recordCopy: (id: string) => Promise<Prompt>
) {
  if (parsePromptVariables(prompt.content).length > 0) {
    setOpen(false)
    setVariablePrompt(prompt)
    return
  }
  await copyPromptContent(prompt, prompt.content, recordCopy)
  setOpen(false)
}

async function copyPromptWithVariables(
  prompt: Prompt,
  values: PromptVariableValues,
  setVariablePrompt: (prompt: Prompt | null) => void,
  recordCopy: (id: string) => Promise<Prompt>
) {
  const content = renderPromptTemplate(prompt.content, values)
  await copyPromptContent(prompt, content, recordCopy)
  setVariablePrompt(null)
}

async function copyPromptContent(
  prompt: Prompt,
  content: string,
  recordCopy: (id: string) => Promise<Prompt>
) {
  await copyText(content)
  await recordCopy(prompt.id)
  toast.success("已複製。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => toast.error(actionErrorMessage(error)))
}
