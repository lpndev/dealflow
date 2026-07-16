import type { ExtractedDeal } from "@dealflow/shared";

const PRODUCT_RE = /\/(?:p|up)\/(MLBU?-?\d+)|\/(MLB-\d+)-/i;

export function productId(): string | null {
  const m = location.pathname.match(PRODUCT_RE);
  const raw = m?.[1] ?? m?.[2];
  return raw ? raw.replace(/-/g, "").toUpperCase() : null;
}

function parseBrl(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const n = Number(text.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function scrape() {
  let name: string | undefined;
  let image: string | undefined;
  let current: number | undefined;
  for (const s of document.querySelectorAll(
    'script[type="application/ld+json"]',
  )) {
    try {
      const j = JSON.parse(s.textContent ?? "");
      const node = Array.isArray(j) ? j.find((x) => x.offers) : j;
      if (node && node.offers) {
        name = node.name;
        image = Array.isArray(node.image) ? node.image[0] : node.image;
        const offer = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        current = offer && Number(offer.price);
        break;
      }
    } catch {
      /* ignore */
    }
  }
  name ||= document.querySelector("h1.ui-pdp-title")?.textContent?.trim();
  const origEl = document.querySelector(
    ".ui-pdp-price__original-value .andes-money-amount__fraction, s .andes-money-amount__fraction",
  );
  const origCents = document.querySelector(
    ".ui-pdp-price__original-value .andes-money-amount__cents, s .andes-money-amount__cents",
  );
  const original = origEl
    ? parseBrl(
        origEl.textContent + (origCents ? "," + origCents.textContent : ""),
      )
    : undefined;
  return { name, image, current, original };
}

const AFFILIATE_API = "https://www.mercadolivre.com.br/affiliate-program/api/v2";

async function affiliateLink(url: string) {
  const tagsRes = await fetch(AFFILIATE_API + "/stripe/user/tags", {
    credentials: "include",
  });
  if (!tagsRes.ok) throw new Error("não autenticado como afiliado");
  const tags = (await tagsRes.json()).tags || [];
  const tag = (tags.find((t: { in_use: boolean }) => t.in_use) || tags[0])?.tag;
  if (!tag) throw new Error("sem etiqueta de afiliado nessa conta");
  const res = await fetch(AFFILIATE_API + "/stripe/user/links", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ url, tag }),
  });
  if (!res.ok) throw new Error("falha ao gerar o link (" + res.status + ")");
  const link = (await res.json()).short_url;
  if (!link) throw new Error("resposta sem short_url");
  return { link: link as string, tag: tag as string };
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
  const reply = await chrome.runtime.sendMessage({
    type: "capture",
    draft,
    affiliateTag,
  });
  if (!reply?.ok) throw new Error(reply?.error || "Dealflow não respondeu");
}
