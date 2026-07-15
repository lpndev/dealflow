const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function supportsMercadoLivre(url: string): boolean {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }
  return /(?:^|\.)(?:mercadoli(?:vre|bre)\.com(?:\.br)?|meli\.la)$/i.test(host);
}

export async function fetchMercadoLivre(url: string): Promise<string> {
  let current = url;
  for (let redirects = 0; redirects <= 5; redirects += 1) {
    if (!supportsMercadoLivre(current)) {
      throw new Error("unsupported marketplace redirect");
    }
    const res = await fetch(current, {
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "pt-BR,pt;q=0.9",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) throw new Error("marketplace redirect without location");
      current = new URL(location, current).toString();
      continue;
    }
    if (!res.ok) throw new Error(`mercado livre responded ${res.status}`);
    return res.text();
  }
  throw new Error("too many marketplace redirects");
}
