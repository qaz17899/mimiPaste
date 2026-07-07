const VARIABLE_PATTERN = /\\?\{\{\s*([^{}]+?)\s*\}\}/gu
const VARIABLE_NAME_PATTERN = /^[\p{L}\p{N}_.-]+$/u

export type PromptVariableValues = Record<string, string>

export function parsePromptVariables(content: string): string[] {
  const names: string[] = []
  const seen = new Set<string>()
  for (const match of content.matchAll(VARIABLE_PATTERN)) {
    if (isEscapedToken(match[0])) continue
    const name = normalizeVariableName(match[1])
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }
  return names
}

export function renderPromptTemplate(
  content: string,
  values: PromptVariableValues
): string {
  return content.replace(VARIABLE_PATTERN, (token, rawName: string) => {
    if (isEscapedToken(token)) return token.slice(1)
    const name = normalizeVariableName(rawName)
    if (!name) return token
    return values[name] ?? ""
  })
}

function normalizeVariableName(value: string): string | null {
  const name = value.trim()
  return VARIABLE_NAME_PATTERN.test(name) ? name : null
}

function isEscapedToken(token: string): boolean {
  return token.startsWith("\\")
}
