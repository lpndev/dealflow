export function parsePrice(text: string): number | undefined {
  const cleaned = text.replace(/[^\d.,]/g, "")
  if (cleaned === "") return undefined

  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned
  const value = Number(normalized)
  return Number.isFinite(value) ? value : undefined
}

const BRL = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export function formatBrl(value: number): string {
  return `R$ ${BRL.format(value)}`
}
