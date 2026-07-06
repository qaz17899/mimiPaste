import { Download, Grid2X2, List, Plus, Search, Star, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import type { PromptListFilters, PromptSort, PromptTag } from "@/features/prompts/prompt-types"

export type PromptViewMode = "cards" | "list"

type Props = {
  filters: PromptListFilters
  tags: PromptTag[]
  viewMode: PromptViewMode
  onCreate: () => void
  onExport: () => void
  onImport: (file: File) => void
  onFiltersChange: (filters: PromptListFilters) => void
  onViewModeChange: (mode: PromptViewMode) => void
}

export function PromptToolbar({
  filters,
  tags,
  viewMode,
  onCreate,
  onExport,
  onImport,
  onFiltersChange,
  onViewModeChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative min-w-64 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.query}
          onChange={(event) => onFiltersChange({ ...filters, query: event.target.value })}
          placeholder="搜尋提示詞..."
          className="pl-8"
        />
      </div>
      <TagFilter tags={tags} value={filters.tag} onChange={(tag) => onFiltersChange({ ...filters, tag })} />
      <SortSelect value={filters.sort} onChange={(sort) => onFiltersChange({ ...filters, sort })} />
      <FavoriteFilter
        checked={filters.favoriteOnly}
        onChange={(favoriteOnly) => onFiltersChange({ ...filters, favoriteOnly })}
      />
      <PromptViewModeToggle viewMode={viewMode} onViewModeChange={onViewModeChange} />
      <ImportButton onImport={onImport} />
      <Button variant="outline" onClick={onExport}>
        <Download data-icon="inline-start" />
        匯出
      </Button>
      <Button onClick={onCreate}>
        <Plus data-icon="inline-start" />
        新增提示詞
      </Button>
    </div>
  )
}

function TagFilter({
  tags,
  value,
  onChange,
}: {
  tags: PromptTag[]
  value: string
  onChange: (value: string) => void
}) {
  const label = value || "全部標籤"
  return (
    <Select value={value || "all"} onValueChange={(next) => onChange(next === "all" || !next ? "" : next)}>
      <SelectTrigger className="w-32">
        <span className="truncate">{label}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="all">全部標籤</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag.id} value={tag.name}>
              {tag.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function SortSelect({ value, onChange }: { value: PromptSort; onChange: (value: PromptSort) => void }) {
  const label = sortLabels[value]
  return (
    <Select value={value} onValueChange={(next) => onChange(next as PromptSort)}>
      <SelectTrigger className="w-32">
        <span className="truncate">{label}</span>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value="updated">最近更新</SelectItem>
          <SelectItem value="copied">最近複製</SelectItem>
          <SelectItem value="copy_count">複製次數</SelectItem>
          <SelectItem value="title">標題</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const sortLabels: Record<PromptSort, string> = {
  updated: "最近更新",
  copied: "最近複製",
  copy_count: "複製次數",
  title: "標題",
}

function FavoriteFilter({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <Field orientation="horizontal" className="h-8 flex-row items-center gap-2">
      <FieldLabel className="flex items-center gap-1 text-sm">
        <Star />
        收藏
      </FieldLabel>
      <Switch checked={checked} onCheckedChange={onChange} />
    </Field>
  )
}

function PromptViewModeToggle({
  viewMode,
  onViewModeChange,
}: {
  viewMode: PromptViewMode
  onViewModeChange: (viewMode: PromptViewMode) => void
}) {
  return (
    <ToggleGroup
      value={[viewMode]}
      onValueChange={(values) => {
        const value = values[0]
        if (value === "cards" || value === "list") onViewModeChange(value)
      }}
      spacing={0}
      variant="outline"
      size="sm"
    >
      <Tooltip>
        <TooltipTrigger render={<ToggleGroupItem value="cards" />}>
          <Grid2X2 />
        </TooltipTrigger>
        <TooltipContent>卡片</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger render={<ToggleGroupItem value="list" />}>
          <List />
        </TooltipTrigger>
        <TooltipContent>列表</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  )
}

function ImportButton({ onImport }: { onImport: (file: File) => void }) {
  return (
    <Button variant="outline" render={<label />}>
      <Upload data-icon="inline-start" />
      匯入
      <input
        type="file"
        accept="application/json,.json"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onImport(file)
          event.currentTarget.value = ""
        }}
      />
    </Button>
  )
}
