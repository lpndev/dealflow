export function isMercadoLivreProduct(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" &&
      /(?:^|\.)mercadolivre\.com\.br$/i.test(url.hostname) &&
      /\/(?:p\/MLB|up\/MLBU)\d+|\/MLB-\d+-/i.test(url.pathname)
    )
  } catch {
    return false
  }
}
