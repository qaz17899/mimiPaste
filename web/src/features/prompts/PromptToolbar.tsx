import {
  Download,
  Grid2X2,
  List,
  Plus,
  Search,
  Star,
  Upload,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import type {
  PromptListFilters,
  PromptSort,
  PromptTag,
} from "@/features/prompts/prompt-types"

export type PromptViewMode = "cards" | "list"

const allTagsValue = "__all_tags__"

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
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search />
          搜尋提示詞
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <ToolbarFilters
          filters={filters}
          tags={tags}
          viewMode={viewMode}
          onFiltersChange={onFiltersChange}
          onViewModeChange={onViewModeChange}
        />
        <ToolbarSearchActions
          filters={filters}
          onCreate={onCreate}
          onExport={onExport}
          onFiltersChange={onFiltersChange}
          onImport={onImport}
        />
      </CardContent>
    </Card>
  )
}

function ToolbarFilters({
  filters,
  tags,
  viewMode,
  onFiltersChange,
  onViewModeChange,
}: Pick<Props, "filters" | "tags" | "viewMode"> &
  Pick<Props, "onFiltersChange" | "onViewModeChange">) {
  return (
    <div data-slot="prompt-toolbar-filters" className="flex justify-end">
      <div className="flex flex-wrap items-center gap-2">
        <PromptViewModeToggle
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
        <TagFilter
          tags={tags}
          value={filters.tag}
          onChange={(tag) => onFiltersChange({ ...filters, tag })}
        />
        <SortSelect
          value={filters.sort}
          onChange={(sort) => onFiltersChange({ ...filters, sort })}
        />
        <FavoriteFilter
          checked={filters.favoriteOnly}
          onChange={(favoriteOnly) =>
            onFiltersChange({ ...filters, favoriteOnly })
          }
        />
      </div>
    </div>
  )
}

function ToolbarSearchActions({
  filters,
  onCreate,
  onExport,
  onFiltersChange,
  onImport,
}: Pick<Props, "filters"> &
  Pick<Props, "onCreate" | "onExport" | "onFiltersChange" | "onImport">) {
  return (
    <div data-slot="prompt-toolbar-actions" className="flex flex-wrap gap-2">
      <Field className="min-w-0 basis-full sm:min-w-72 sm:flex-1 sm:basis-auto">
        <FieldLabel htmlFor="prompt-search" className="sr-only">
          搜尋提示詞
        </FieldLabel>
        <InputGroup>
          <InputGroupAddon>
            <InputGroupText>
              <Search />
            </InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            id="prompt-search"
            value={filters.query}
            onChange={(event) =>
              onFiltersChange({ ...filters, query: event.target.value })
            }
            placeholder="搜尋提示詞..."
          />
        </InputGroup>
      </Field>
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
  const items = [
    { label: "全部標籤", value: allTagsValue },
    ...tags.map((tag) => ({ label: tag.name, value: tag.name })),
  ]
  return (
    <Select
      items={items}
      value={value || allTagsValue}
      onValueChange={(next) =>
        onChange(next === allTagsValue || !next ? "" : next)
      }
    >
      <SelectTrigger aria-label="篩選標籤" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={allTagsValue}>全部標籤</SelectItem>
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

function SortSelect({
  value,
  onChange,
}: {
  value: PromptSort
  onChange: (value: PromptSort) => void
}) {
  const items = sortOptions.map((option) => ({
    label: option.label,
    value: option.value,
  }))
  return (
    <Select
      items={items}
      value={value}
      onValueChange={(next) => onChange(next as PromptSort)}
    >
      <SelectTrigger aria-label="排序提示詞" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {sortOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const sortOptions: { label: string; value: PromptSort }[] = [
  { label: "最近更新", value: "updated" },
  { label: "最近複製", value: "copied" },
  { label: "複製次數", value: "copy_count" },
  { label: "標題", value: "title" },
]

function FavoriteFilter({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <Field
      orientation="horizontal"
      className="h-8 w-auto shrink-0 flex-row items-center gap-2"
    >
      <FieldLabel
        htmlFor="prompt-favorite-filter"
        className="flex items-center gap-1 text-sm"
      >
        <Star />
        收藏
      </FieldLabel>
      <Switch
        id="prompt-favorite-filter"
        checked={checked}
        onCheckedChange={onChange}
      />
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
        <TooltipTrigger
          render={<ToggleGroupItem value="cards" aria-label="卡片" />}
        >
          <Grid2X2 data-icon="inline-start" />
        </TooltipTrigger>
        <TooltipContent>卡片</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger
          render={<ToggleGroupItem value="list" aria-label="列表" />}
        >
          <List data-icon="inline-start" />
        </TooltipTrigger>
        <TooltipContent>列表</TooltipContent>
      </Tooltip>
    </ToggleGroup>
  )
}

function ImportButton({ onImport }: { onImport: (file: File) => void }) {
  return (
    <Button variant="outline" render={<label />} nativeButton={false}>
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
