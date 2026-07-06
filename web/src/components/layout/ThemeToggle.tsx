import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const THEME_SEQUENCE = ["system", "light", "dark"] as const

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const nextTheme =
    THEME_SEQUENCE[
      (THEME_SEQUENCE.indexOf(theme) + 1) % THEME_SEQUENCE.length
    ]
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setTheme(nextTheme)}
          />
        }
      >
        <Icon />
        <span className="sr-only">切換外觀</span>
      </TooltipTrigger>
      <TooltipContent>切換外觀</TooltipContent>
    </Tooltip>
  )
}
