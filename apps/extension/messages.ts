import type { ExtractedDeal, PageMessage } from "@dealflow/shared"

export type RuntimeMessage =
  | { type: "mint"; sourceUrl: string }
  | { type: "mint-failed"; error?: string }
  | { type: "mint-error"; error?: string }
  | { type: "capture"; draft: ExtractedDeal; affiliateTag?: string }

export type CaptureReply = { ok: boolean; error?: string }

export function asRuntimeMessage(value: unknown): RuntimeMessage | null {
  if (typeof value !== "object" || value === null) return null
  const { type, sourceUrl } = value as { type?: unknown; sourceUrl?: unknown }
  if (typeof type !== "string") return null
  if (type === "mint" && typeof sourceUrl !== "string") return null
  return value as RuntimeMessage
}

export function asPageMessage(value: unknown): PageMessage | null {
  if (typeof value !== "object" || value === null) return null
  const { source, type, sourceUrl } = value as {
    source?: unknown
    type?: unknown
    sourceUrl?: unknown
  }
  if (typeof source !== "string" || typeof type !== "string") return null
  if (type === "mint" && typeof sourceUrl !== "string") return null
  return value as PageMessage
}

export function sendRuntimeMessage(message: RuntimeMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(message)
}
