import { useState } from "react"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/layout/ThemeToggle"

import { useSettings, useSettingsMutations } from "@/features/settings/settings-queries"

export function SettingsWorkspace() {
  const settingsQuery = useSettings()
  const mutation = useSettingsMutations().update
  const settings = settingsQuery.data
  const [backupDraft, setBackupDraft] = useState<string | null>(null)
  const backupDir = backupDraft ?? settings?.backup_dir ?? ""

  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>本機資料</CardTitle>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel>資料庫路徑</FieldLabel>
              <Input value={settings?.db_path ?? ""} readOnly />
            </Field>
            <Field>
              <FieldLabel>備份目錄</FieldLabel>
              <Input value={backupDir} onChange={(event) => setBackupDraft(event.target.value)} />
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="justify-end">
          <Button disabled={mutation.isPending} onClick={() => runAction(saveBackupDir(backupDir, mutation.mutateAsync))}>
            <Save data-icon="inline-start" />
            儲存
          </Button>
        </CardFooter>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>外觀</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>診斷</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
          <Info label="服務版本" value={settings?.service_version ?? ""} />
          <Info label="資料版本" value={settings?.migration_version ?? ""} />
          <Info label="遷移目錄" value={settings?.migrations_dir ?? ""} />
        </CardContent>
      </Card>
    </section>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="truncate font-mono text-sm">{value}</div>
    </div>
  )
}

async function saveBackupDir(backupDir: string, save: (input: { backup_dir: string }) => Promise<unknown>) {
  await save({ backup_dir: backupDir })
  toast.success("設定已儲存。")
}

function runAction(action: Promise<unknown>) {
  action.catch((error: unknown) => {
    toast.error(error instanceof Error ? error.message : "操作失敗。")
  })
}
