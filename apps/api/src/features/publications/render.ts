import { formatBrl } from "@/shared/money";

export type RenderInput = {
  title: string;
  originalPrice?: number;
  currentPrice?: number;
  coupon?: string;
  affiliateUrl: string;
};

export const DEFAULT_TEMPLATE = [
  "🔥 *{titulo}*",
  "",
  "~De {de}~",
  "💰 *Por {por}*",
  "",
  "🎟 Cupom: *{cupom}*",
  "",
  "🛒 {link}",
].join("\n");

export const PLACEHOLDERS = ["titulo", "de", "por", "cupom", "link"] as const;

export function renderPublication(
  input: RenderInput,
  template: string = DEFAULT_TEMPLATE,
): string {
  const values: Record<string, string> = {
    titulo: input.title,
    de: input.originalPrice !== undefined ? formatBrl(input.originalPrice) : "",
    por: input.currentPrice !== undefined ? formatBrl(input.currentPrice) : "",
    cupom: input.coupon ?? "",
    link: input.affiliateUrl,
  };

  const kept = template.split("\n").filter((line) => {
    const used = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (used.length === 0) return true;
    return used.some((name) => values[name]);
  });

  return kept
    .map((line) =>
      line.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? ""),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
