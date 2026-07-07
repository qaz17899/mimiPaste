import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

import {
  parsePromptVariables,
  type PromptVariableValues,
} from "@/features/prompts/prompt-variables"
import type { Prompt } from "@/features/prompts/prompt-types"

type Props = {
  open: boolean
  pending: boolean
  prompt: Prompt | null
  onCancel: () => void
  onConfirm: (prompt: Prompt, values: PromptVariableValues) => void
}

export function PromptVariableDialog(props: Props) {
  const variables = usePromptVariables(props.prompt)
  if (!props.prompt) return null

  return (
    <Dialog open={props.open} onOpenChange={(open) => !open && props.onCancel()}>
      <DialogContent className="sm:max-w-md">
        <PromptVariableForm
          key={`${props.prompt.id}:${variables.join("\u0000")}`}
          pending={props.pending}
          prompt={props.prompt}
          variables={variables}
          onCancel={props.onCancel}
          onConfirm={props.onConfirm}
        />
      </DialogContent>
    </Dialog>
  )
}

function PromptVariableForm({
  pending,
  prompt,
  variables,
  onCancel,
  onConfirm,
}: {
  pending: boolean
  prompt: Prompt
  variables: string[]
  onCancel: () => void
  onConfirm: (prompt: Prompt, values: PromptVariableValues) => void
}) {
  const [values, setValues] = useState(() => initialValues(variables))
  const [error, setError] = useState("")
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const missing = firstMissingVariable(variables, values)
    if (missing) return setError("缺少必要欄位。")
    onConfirm(prompt, values)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={submit}>
      <DialogHeader>
        <DialogTitle>填入變數</DialogTitle>
      </DialogHeader>
      <VariableFields
        error={error}
        values={values}
        variables={variables}
        onValuesChange={setValues}
      />
      <PromptVariableFooter pending={pending} onCancel={onCancel} />
    </form>
  )
}

function VariableFields({
  error,
  values,
  variables,
  onValuesChange,
}: {
  error: string
  values: PromptVariableValues
  variables: string[]
  onValuesChange: (values: PromptVariableValues) => void
}) {
  return (
    <FieldGroup>
      {variables.map((name, index) => (
        <VariableField
          key={name}
          index={index}
          name={name}
          value={values[name] ?? ""}
          onValueChange={(value) => onValuesChange({ ...values, [name]: value })}
        />
      ))}
      {error ? <FieldError>{error}</FieldError> : null}
    </FieldGroup>
  )
}

function PromptVariableFooter({
  pending,
  onCancel,
}: {
  pending: boolean
  onCancel: () => void
}) {
  return (
    <DialogFooter>
      <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
        取消
      </Button>
      <Button type="submit" disabled={pending}>
        複製
      </Button>
    </DialogFooter>
  )
}

function VariableField({
  index,
  name,
  value,
  onValueChange,
}: {
  index: number
  name: string
  value: string
  onValueChange: (value: string) => void
}) {
  const id = `prompt-variable-${index}`
  return (
    <Field>
      <FieldLabel htmlFor={id}>{name}</FieldLabel>
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </Field>
  )
}

function usePromptVariables(prompt: Prompt | null): string[] {
  return useMemo(
    () => (prompt ? parsePromptVariables(prompt.content) : []),
    [prompt]
  )
}

function initialValues(variables: string[]): PromptVariableValues {
  return Object.fromEntries(variables.map((name) => [name, ""]))
}

function firstMissingVariable(
  variables: string[],
  values: PromptVariableValues
): string | null {
  return variables.find((name) => !values[name]?.trim()) ?? null
}
