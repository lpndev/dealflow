import type { ExtractedDeal } from "@dealflow/shared"
import { getSettings, updateSettings } from "@/features/settings/use-case"
import type { Db } from "@/shared/db"
import { isHttpUrl, isTrustedImageUrl } from "@/shared/urls"

const pending = new Map<string, ExtractedDeal>()

function httpUrl(value: unknown): string | undefined {
  return typeof value === "string" && value.length <= 1000 && isHttpUrl(value)
    ? value
    : undefined
}

function shortString(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined
  const trimmed = value.trim()
  return trimmed && trimmed.length <= max ? trimmed : undefined
}

function money(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : undefined
}

export function sanitizeDraft(value: unknown): ExtractedDeal | null {
  if (typeof value !== "object" || value === null) return null
  const raw = value as Record<string, unknown>
  const affiliateUrl = httpUrl(raw.affiliateUrl)
  const sourceUrl = httpUrl(raw.sourceUrl)
  if (!affiliateUrl || !sourceUrl) return null

  const product = (raw.product ?? {}) as Record<string, unknown>
  const price = (raw.price ?? {}) as Record<string, unknown>
  const imageUrl = shortString(product.imageUrl, 1000)
  return {
    sourceUrl,
    affiliateUrl,
    product: {
      externalId: shortString(product.externalId, 40),
      title: shortString(product.title, 300),
      imageUrl: imageUrl && isTrustedImageUrl(imageUrl) ? imageUrl : undefined
    },
    price: { original: money(price.original), current: money(price.current) },
    coupon: shortString(raw.coupon, 100)
  }
}

export function storeCapture(workspaceId: string, draft: ExtractedDeal) {
  pending.set(workspaceId, draft)
}

export function takeCapture(workspaceId: string): ExtractedDeal | null {
  const draft = pending.get(workspaceId) ?? null
  pending.delete(workspaceId)
  return draft
}

export function adoptAffiliateTag(
  db: Db,
  workspaceId: string,
  tag: unknown
): void {
  const value = shortString(tag, 60)
  if (!value) return
  if (getSettings(db, workspaceId).mlAffiliateTag) return
  updateSettings(db, workspaceId, { mlAffiliateTag: value })
}
