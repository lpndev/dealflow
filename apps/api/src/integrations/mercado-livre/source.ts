const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"

export function supportsMercadoLivre(url: string): boolean {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }
  return /(?:^|\.)(?:mercadoli(?:vre|bre)\.com(?:\.br)?|meli\.la)$/i.test(host)
}

function fakeMercadoLivre(url: string): string {
  const id = /MLBU?-?\d+/i.exec(url)?.[0]?.replace("-", "") ?? "MLB123"
  return `<!doctype html><html><head>
    <meta property="og:title" content="Air Fryer 5L Mondial">
    <meta property="og:image" content="https://http2.mlstatic.com/${id}.jpg">
    <script type="application/ld+json">${JSON.stringify({
      "@type": "Product",
      name: "Air Fryer 5L Mondial",
      image: `https://http2.mlstatic.com/${id}.jpg`,
      offers: { price: 299.9 }
    })}</script>
  </head><body></body></html>`
}

const useFakes =
  process.env.NODE_ENV !== "production" && !!process.env.DEALFLOW_FAKE_ML

export const fetchMercadoLivre: (url: string) => Promise<string> = useFakes
  ? (url) => Promise.resolve(fakeMercadoLivre(url))
  : realFetchMercadoLivre

export async function realFetchMercadoLivre(url: string): Promise<string> {
  let current = url
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (!supportsMercadoLivre(current)) {
      throw new Error("unsupported marketplace redirect")
    }
    const res = await fetch(current, {
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "pt-BR,pt;q=0.9"
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000)
    })
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location")
      if (!location) throw new Error("marketplace redirect without location")
      current = new URL(location, current).toString()
      continue
    }
    if (!res.ok) throw new Error(`mercado livre responded ${res.status}`)
    return res.text()
  }
  throw new Error("too many marketplace redirects")
}
