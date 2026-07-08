import { formatBrl } from "@/shared/money";

export type RenderInput = {
  title: string;
  originalPrice?: number;
  currentPrice?: number;
  coupon?: string;
  affiliateUrl: string;
};

export function renderPublication(input: RenderInput): string {
  const priceLines = [
    input.originalPrice !== undefined
      ? `~De ${formatBrl(input.originalPrice)}~`
      : null,
    input.currentPrice !== undefined
      ? `💰 *Por ${formatBrl(input.currentPrice)}*`
      : null,
  ].filter((line): line is string => line !== null);

  const blocks = [
    `🔥 *${input.title}*`,
    priceLines.join("\n"),
    input.coupon ? `🎟 Cupom: *${input.coupon}*` : null,
    `🛒 ${input.affiliateUrl}`,
  ].filter((block): block is string => block !== null && block !== "");

  return blocks.join("\n\n");
}
