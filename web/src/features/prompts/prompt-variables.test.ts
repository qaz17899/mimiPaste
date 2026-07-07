import { describe, expect, it } from "vitest"

import {
  parsePromptVariables,
  renderPromptTemplate,
} from "@/features/prompts/prompt-variables"

describe("prompt variables", () => {
  it("parses unique unescaped variables in first-seen order", () => {
    expect(
      parsePromptVariables(
        "Hi {{project}} from {{ owner }}. {{project}} \\{{literal}} {{bad name!}}"
      )
    ).toEqual(["project", "owner"])
  })

  it("renders variable values without changing escaped or invalid tokens", () => {
    expect(
      renderPromptTemplate(
        "Hi {{ project }}. Keep \\{{literal}} and {{bad name!}}.",
        { project: "mimiPaste" }
      )
    ).toBe("Hi mimiPaste. Keep {{literal}} and {{bad name!}}.")
  })
})
