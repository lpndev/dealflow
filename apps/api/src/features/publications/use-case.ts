import { and, eq } from "drizzle-orm";
import type { Db } from "@/shared/db";
import {
  product,
  dealSnapshot,
  affiliateLink,
  publication,
} from "@/shared/schema";
import { renderPublication, type RenderInput } from "./render";
import { getSettings } from "@/features/settings/use-case";
import { parsePrice } from "@/shared/money";
import { normalizeUrl } from "@/shared/urls";
import { mlbIdFromUrl } from "@/integrations/mercado-livre/parse";
import { PublicationError } from "@/shared/errors";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

const PROVIDER = "mercado-livre";

export type PublicationInput = {
  title?: string;
  imageUrl?: string;
  originalPrice?: string;
  currentPrice?: string;
  coupon?: string;
  sourceUrl?: string;
  affiliateUrl?: string;
};

export type PublicationResult = {
  id: string;
  content: string;
  status: "ready";
};

export function previewPublication(
  input: PublicationInput,
  db: Db,
): { content: string } {
  const { messageTemplate } = getSettings(db);
  return { content: renderPublication(toRenderInput(input), messageTemplate) };
}

export function createPublication(
  input: PublicationInput,
  db: Db,
): PublicationResult {
  const title = input.title?.trim();
  const affiliateUrl = input.affiliateUrl?.trim();
  const sourceUrl = input.sourceUrl?.trim();

  if (!title) throw new PublicationError("title is required");
  if (!affiliateUrl) throw new PublicationError("affiliate link is required");
  if (!isHttpUrl(affiliateUrl)) {
    throw new PublicationError("affiliate link must be a valid url");
  }
  if (sourceUrl && sameUrl(affiliateUrl, sourceUrl)) {
    throw new PublicationError("affiliate link must not be the source link");
  }

  const render = toRenderInput(input);
  const content = renderPublication(render, getSettings(db).messageTemplate);
  const workspaceId = DEFAULT_WORKSPACE_ID;

  const productId = upsertProduct(db, {
    workspaceId,
    externalId: sourceUrl ? mlbIdFromUrl(sourceUrl) : undefined,
    canonicalUrl: sourceUrl,
    title,
    imageUrl: input.imageUrl?.trim() || undefined,
  });

  const dealId = crypto.randomUUID();
  db.insert(dealSnapshot)
    .values({
      id: dealId,
      workspaceId,
      productId,
      originalPrice: render.originalPrice,
      currentPrice: render.currentPrice,
      coupon: render.coupon,
    })
    .run();

  const affiliateLinkId = crypto.randomUUID();
  db.insert(affiliateLink)
    .values({ id: affiliateLinkId, workspaceId, productId, url: affiliateUrl })
    .run();

  const id = crypto.randomUUID();
  db.insert(publication)
    .values({ id, workspaceId, dealId, affiliateLinkId, content })
    .run();

  return { id, content, status: "ready" };
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
    affiliateUrl: input.affiliateUrl?.trim() ?? "",
  };
}

function upsertProduct(
  db: Db,
  input: {
    workspaceId: string;
    externalId?: string;
    canonicalUrl?: string;
    title?: string;
    imageUrl?: string;
  },
): string {
  if (input.externalId) {
    const existing = db
      .select({ id: product.id })
      .from(product)
      .where(
        and(
          eq(product.workspaceId, input.workspaceId),
          eq(product.provider, PROVIDER),
          eq(product.externalId, input.externalId),
        ),
      )
      .get();
    if (existing) {
      db.update(product)
        .set({ title: input.title, imageUrl: input.imageUrl })
        .where(eq(product.id, existing.id))
        .run();
      return existing.id;
    }
  }

  const id = crypto.randomUUID();
  db.insert(product)
    .values({
      id,
      workspaceId: input.workspaceId,
      provider: PROVIDER,
      externalId: input.externalId,
      canonicalUrl: input.canonicalUrl,
      title: input.title,
      imageUrl: input.imageUrl,
    })
    .run();
  return id;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function sameUrl(a: string, b: string): boolean {
  try {
    return normalizeUrl(a) === normalizeUrl(b);
  } catch {
    return a === b;
  }
}
