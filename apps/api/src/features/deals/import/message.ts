import { parsePrice } from "@/shared/money";

export type MessageHints = {
  original?: number;
  current?: number;
  coupon?: string;
};

// eslint-disable-next-line sonarjs/super-linear-regex -- disjoint classes, measured linear to 100k chars
const PRICE = /(\bde\b|\bpor\b)?\s*R\$\s*(\d[\d.]*(?:,\d+)?)/gi;
const COUPON = /(?:cupom|coupon|c[óo]digo)[:\s]+([a-z0-9][a-z0-9-]{2,})/i;

export function extractMessageHints(text: string): MessageHints {
  const prices = [...text.matchAll(PRICE)].map((m) => ({
    kw: m[1]?.toLowerCase(),
    value: parsePrice(m[2]),
  }));

  let original = prices.find((p) => p.kw === "de")?.value;
  let current = prices.find((p) => p.kw === "por")?.value;
  if (original === undefined && current === undefined) {
    const bare = prices.filter((p) => !p.kw).map((p) => p.value);
    if (bare.length === 1) current = bare[0];
    else if (bare.length >= 2) [original, current] = bare;
  }

  const match = COUPON.exec(text);
  const code = match?.[1];
  const coupon =
    code && (/\d/.test(code) || code === code.toUpperCase()) ? code : undefined;

  const hints: MessageHints = {};
  if (original !== undefined) hints.original = original;
  if (current !== undefined) hints.current = current;
  if (coupon) hints.coupon = coupon;
  return hints;
}
