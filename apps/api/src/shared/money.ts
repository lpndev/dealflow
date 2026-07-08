export function parseBrlPrice(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (cleaned === "") return undefined;

  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}
