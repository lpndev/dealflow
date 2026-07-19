import type { ExtractedDeal } from "@dealflow/shared";
import { sendRuntimeMessage, type CaptureReply } from "../messages";

type LdNode = { name?: string; image?: string | string[]; offers?: unknown };
type AffiliateTag = { tag?: string; in_use?: boolean };

const PRODUCT_RE = /\/(?:p|up)\/(MLBU?-?\d+)|\/(MLB-\d+)-/i;

export function productId(): string | null {
  const m = PRODUCT_RE.exec(location.pathname);
  const raw = m?.[1] ?? m?.[2];
  return raw ? raw.replace(/-/g, "").toUpperCase() : null;
}

function parseBrl(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

const first = <T>(value: T | T[]): T =>
  Array.isArray(value) ? value[0] : value;

function offerNode(): LdNode {
  for (const s of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const parsed = JSON.parse(s.textContent ?? "") as LdNode | LdNode[];
      const node = Array.isArray(parsed)
        ? parsed.find((x) => x.offers)
        : parsed;
      if (node?.offers) return node;
    } catch {
      continue;
    }
  }
  return {};
}

function originalPrice(): number | undefined {
  const el = document.querySelector(
    ".ui-pdp-price__original-value .andes-money-amount__fraction, s .andes-money-amount__fraction",
  );
  if (!el) return undefined;
  const cents = document.querySelector(
    ".ui-pdp-price__original-value .andes-money-amount__cents, s .andes-money-amount__cents",
  );
  return parseBrl(el.textContent + (cents ? "," + cents.textContent : ""));
}

function scrape() {
  const node = offerNode();
  const offer = node.offers
    ? (first(node.offers) as { price?: unknown })
    : undefined;
  return {
    name:
      node.name ||
      document.querySelector("h1.ui-pdp-title")?.textContent?.trim(),
    image: node.image ? first(node.image) : undefined,
    current: offer ? Number(offer.price) : undefined,
    original: originalPrice(),
  };
}

const AFFILIATE_API =
  "https://www.mercadolivre.com.br/affiliate-program/api/v2";

async function affiliateLink(url: string) {
  const tagsRes = await fetch(AFFILIATE_API + "/stripe/user/tags", {
    credentials: "include",
  }).catch(() => null);
  if (!tagsRes)
    throw new Error("Sem conexão com o Mercado Livre. Verifique sua internet.");
  if (!tagsRes.ok)
    throw new Error(
      "Entre no Mercado Livre como afiliado para gerar o link (você não está autenticado).",
    );
  const { tags = [] } = (await tagsRes.json()) as { tags?: AffiliateTag[] };
  const tag = (tags.find((t) => t.in_use) ?? tags[0])?.tag;
  if (!tag)
    throw new Error(
      "Sua conta do Mercado Livre não tem uma etiqueta de afiliado ativa.",
    );
  const res = await fetch(AFFILIATE_API + "/stripe/user/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, tag }),
  }).catch(() => null);
  if (!res)
    throw new Error("Sem conexão com o Mercado Livre. Verifique sua internet.");
  if (!res.ok)
    throw new Error(
      "O Mercado Livre recusou gerar o link (" + res.status + ").",
    );
  const { short_url: link } = (await res.json()) as { short_url?: string };
  if (!link) throw new Error("O Mercado Livre respondeu sem o link.");
  return { link, tag };
}

export async function capture(setStatus: (t: string) => void) {
  const url = location.href.split("?")[0].split("#")[0];
  setStatus("Gerando link…");
  const { link: affiliateUrl, tag: affiliateTag } = await affiliateLink(url);
  setStatus("Lendo a oferta…");
  const { name, image, current, original } = scrape();
  const draft: ExtractedDeal = {
    sourceUrl: url,
    affiliateUrl,
    product: {
      externalId: productId() ?? undefined,
      title: name,
      imageUrl: image,
    },
    price: { original, current },
  };
  setStatus("Enviando…");
  const reply = (await sendRuntimeMessage({
    type: "capture",
    draft,
    affiliateTag,
  })) as CaptureReply | undefined;
  if (!reply?.ok) throw new Error(reply?.error ?? "Dealflow não respondeu");
}
