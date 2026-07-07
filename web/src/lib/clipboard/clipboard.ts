import { UserVisibleError } from "@/lib/errors/user-visible-error"

export async function copyText(text: string): Promise<void> {
  if (!navigator.clipboard?.writeText) {
    throw new UserVisibleError("無法使用剪貼簿，請確認瀏覽器權限。")
  }
  await navigator.clipboard.writeText(text)
}
