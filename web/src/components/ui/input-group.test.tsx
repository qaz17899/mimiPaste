import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"

describe("InputGroup", () => {
  it("keeps addons from showing the text cursor", () => {
    const { container } = render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>搜尋</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label="搜尋提示詞" />
      </InputGroup>
    )

    const addon = container.querySelector('[data-slot="input-group-addon"]')
    const text = container.querySelector('[data-slot="input-group-text"]')

    expect(addon?.className).toContain("cursor-default")
    expect(addon?.className).not.toContain("cursor-text")
    expect(text?.className).toContain("cursor-default")
  })
})
