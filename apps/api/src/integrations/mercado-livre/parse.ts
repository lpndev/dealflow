import type { ExtractedDeal } from "@/shared/types";

type LdOffer = { price?: string | number };
type LdNode = {
  "@type"?: string;
  name?: string;
  image?: string | string[];
  offers?: LdOffer | LdOffer[];
};

export function mlbIdFromUrl(url: string): string | undefined {
  const match = url.match(/MLB-?(\d+)/i);
  return match ? `MLB${match[1]}` : undefined;
}

export function parseMercadoLivre(
  html: string,
  sourceUrl: string,
): ExtractedDeal {
  const product = jsonLdProduct(html);

  return {
    sourceUrl,
    product: {
      externalId: mlbIdFromUrl(sourceUrl),
      title: product?.name ?? metaContent(html, "og:title"),
      imageUrl: firstImage(product?.image) ?? metaContent(html, "og:image"),
    },
    price: { current: offerPrice(product?.offers) },
  };
}

function jsonLdProduct(html: string): LdNode | undefined {
  const blocks = html.matchAll(
    /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    let data: unknown;
    try {
      data = JSON.parse(block[1].trim());
    } catch {
      continue;
    }
    const node = ldNodes(data).find(
      (n) => n["@type"] === "Product" || n.offers,
    );
    if (node) return node;
  }
  return undefined;
}

function ldNodes(data: unknown): LdNode[] {
  if (Array.isArray(data)) return data as LdNode[];
  if (data && typeof data === "object" && "@graph" in data) {
    return ((data as { "@graph": LdNode[] })["@graph"] ?? []) as LdNode[];
  }
  return [data as LdNode];
}

function firstImage(image: string | string[] | undefined): string | undefined {
  if (!image) return undefined;
  return Array.isArray(image) ? image[0] : image;
}

function offerPrice(
  offers: LdOffer | LdOffer[] | undefined,
): number | undefined {
  if (!offers) return undefined;
  const offer = Array.isArray(offers) ? offers[0] : offers;
  const price = Number(offer?.price);
  return Number.isFinite(price) ? price : undefined;
}

function metaContent(html: string, property: string): string | undefined {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    if (new RegExp(`(?:property|name)=["']${property}["']`, "i").test(tag)) {
      const content = tag.match(/content=["']([^"']*)["']/i);
      if (content) return decodeEntities(content[1]);
    }
  }
  return undefined;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
