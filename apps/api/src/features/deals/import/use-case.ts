import { extractUrls, normalizeUrl } from "@/shared/urls";
import {
  parseMercadoLivre,
  mlbIdFromUrl,
  productUrlFromSocialHtml,
} from "@/integrations/mercado-livre/parse";
import {
  fetchMercadoLivre,
  supportsMercadoLivre,
} from "@/integrations/mercado-livre/source";
import { ImportError } from "@/shared/errors";
import { extractMessageHints } from "./message";
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

  if (mlbIdFromUrl(url)) {
    return withHints(parseMercadoLivre(await fetchHtml(url), url), input);
  }

  const landing = await fetchHtml(url);
  const productUrl = productUrlFromSocialHtml(landing);
  if (!productUrl) {
    return withHints(parseMercadoLivre(landing, url), input, url);
  }

  const social = parseMercadoLivre(landing, url);
  const product = parseMercadoLivre(await fetchHtml(productUrl), productUrl);
  const merged: ExtractedDeal = {
    sourceUrl: productUrl,
    product: {
      externalId: product.product.externalId ?? social.product.externalId,
      title: product.product.title ?? social.product.title,
      imageUrl: product.product.imageUrl ?? social.product.imageUrl,
    },
    price: product.price,
  };
  return withHints(merged, input, url);
}

function withHints(
  deal: ExtractedDeal,
  input: string,
  affiliateUrl?: string,
): ExtractedDeal {
  const hints = extractMessageHints(input);
  return {
    ...deal,
    affiliateUrl,
    price: {
      original: hints.original ?? deal.price.original,
      current: hints.current ?? deal.price.current,
    },
    coupon: hints.coupon ?? deal.coupon,
  };
}
