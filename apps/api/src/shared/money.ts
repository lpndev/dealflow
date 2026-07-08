export function parsePrice(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.,]/g, "");
  if (cleaned === "") return undefined;

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : undefined;
}

export function formatBrl(value: number): string {
  const [int, dec] = value.toFixed(2).split(".");
  const withThousands = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${withThousands},${dec}`;
}
