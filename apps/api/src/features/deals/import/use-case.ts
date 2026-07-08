import { extractUrls, normalizeUrl } from "@/shared/urls";
import { parseMercadoLivre } from "@/integrations/mercado-livre/parse";
import {
  fetchMercadoLivre,
  supportsMercadoLivre,
} from "@/integrations/mercado-livre/source";
import { ImportError } from "@/shared/errors";
import type { ExtractedDeal } from "@/shared/types";

type Fetcher = (url: string) => Promise<string>;

export async function importDeal(
  input: string,
  fetchHtml: Fetcher = fetchMercadoLivre,
): Promise<ExtractedDeal> {
  const url = extractUrls(input).map(normalizeUrl).find(supportsMercadoLivre);
  if (!url) {
    throw new ImportError("no supported product url found in the input");
  }
  const html = await fetchHtml(url);
  return parseMercadoLivre(html, url);
}
