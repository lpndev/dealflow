import type { PublicationDraft } from "@dealflow/shared"
import { and, eq } from "drizzle-orm"
import { getSettings } from "@/features/settings/use-case"
import type { Db } from "@/shared/db"
import { PublicationError } from "@/shared/errors"
import { parsePrice } from "@/shared/money"
import {
  affiliateLink,
  dealSnapshot,
  product,
  publication
} from "@/shared/schema"
import { isHttpUrl, isTrustedImageUrl, normalizeUrl } from "@/shared/urls"
import { renderPublication, type RenderInput } from "./render"

const PROVIDER = "mercado-livre"

export type PublicationInput = Partial<PublicationDraft>

export type PublicationResult = {
  id: string
  content: string
  status: "ready"
}

export async function previewPublication(
  input: PublicationInput,
  db: Db,
  workspaceId: string
): Promise<{ content: string }> {
  const { messageTemplate } = await getSettings(db, workspaceId)
  return { content: renderPublication(toRenderInput(input), messageTemplate) }
}

export async function createPublication(
  input: PublicationInput,
  db: Db,
  workspaceId: string
): Promise<PublicationResult> {
  const title = input.title?.trim()
  const affiliateUrl = input.affiliateUrl?.trim()
  const sourceUrl = input.sourceUrl?.trim()

  if (!title) throw new PublicationError("title is required")
  if (!affiliateUrl) throw new PublicationError("affiliate link is required")
  if (!isHttpUrl(affiliateUrl)) {
    throw new PublicationError("affiliate link must be a valid url")
  }
  if (sourceUrl && sameUrl(affiliateUrl, sourceUrl)) {
    throw new PublicationError("affiliate link must not be the source link")
  }
  if (input.imageUrl && !isTrustedImageUrl(input.imageUrl)) {
    throw new PublicationError("image must use the Mercado Livre image CDN")
  }

  const render = toRenderInput(input)
  const content = renderPublication(
    render,
    (await getSettings(db, workspaceId)).messageTemplate
  )

  const productId = await upsertProduct(db, {
    workspaceId,
    externalId: input.externalId?.trim() || undefined,
    canonicalUrl: sourceUrl,
    title,
    imageUrl: input.imageUrl?.trim() || undefined
  })

  const dealId = crypto.randomUUID()
  await db
    .insert(dealSnapshot)
    .values({
      id: dealId,
      workspaceId,
      productId,
      originalPrice: render.originalPrice,
      currentPrice: render.currentPrice,
      coupon: render.coupon
    })
    .run()

  const affiliateLinkId = crypto.randomUUID()
  await db
    .insert(affiliateLink)
    .values({ id: affiliateLinkId, workspaceId, productId, url: affiliateUrl })
    .run()

  const id = crypto.randomUUID()
  await db
    .insert(publication)
    .values({ id, workspaceId, dealId, affiliateLinkId, content })
    .run()

  return { id, content, status: "ready" }
}

function toRenderInput(input: PublicationInput): RenderInput {
  return {
    title: input.title?.trim() ?? "",
    originalPrice: input.originalPrice
      ? parsePrice(input.originalPrice)
      : undefined,
    currentPrice: input.currentPrice
      ? parsePrice(input.currentPrice)
      : undefined,
    coupon: input.coupon?.trim() || undefined,
    affiliateUrl: input.affiliateUrl?.trim() ?? ""
  }
}

async function upsertProduct(
  db: Db,
  input: {
    workspaceId: string
    externalId?: string
    canonicalUrl?: string
    title?: string
    imageUrl?: string
  }
): Promise<string> {
  if (input.externalId) {
    const existing = await db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.workspaceId, input.workspaceId),
          eq(product.provider, PROVIDER),
          eq(product.externalId, input.externalId)
        )
      )
      .get()
    if (existing) {
      await db
        .update(product)
        .set({ title: input.title, imageUrl: input.imageUrl })
        .where(eq(product.id, existing.id))
        .run()
      return existing.id
    }
  }

  const id = crypto.randomUUID()
  await db
    .insert(product)
    .values({
      id,
      workspaceId: input.workspaceId,
      provider: PROVIDER,
      externalId: input.externalId,
      canonicalUrl: input.canonicalUrl,
      title: input.title,
      imageUrl: input.imageUrl
    })
    .run()
  return id
}

function sameUrl(a: string, b: string): boolean {
  try {
    return normalizeUrl(a) === normalizeUrl(b)
  } catch {
    return a === b
  }
}
