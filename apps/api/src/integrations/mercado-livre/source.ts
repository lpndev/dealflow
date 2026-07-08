const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export function supportsMercadoLivre(url: string): boolean {
  return /mercadoli(?:vre|bre)\./i.test(url);
}

export async function fetchMercadoLivre(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "user-agent": USER_AGENT, "accept-language": "pt-BR,pt;q=0.9" },
    redirect: "follow",
  });
  if (!res.ok) {
    throw new Error(`mercado livre responded ${res.status}`);
  }
  return res.text();
}
