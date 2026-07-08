import { it, expect } from "bun:test";
import {
  mlbIdFromUrl,
  parseMercadoLivre,
} from "@/integrations/mercado-livre/parse";

it("reads the mlb id from a /p/ url", () => {
  expect(
    mlbIdFromUrl("https://www.mercadolivre.com.br/air-fryer/p/MLB123"),
  ).toBe("MLB123");
});

it("reads the mlb id from an old hyphenated url", () => {
  expect(
    mlbIdFromUrl(
      "https://produto.mercadolivre.com.br/MLB-456789-air-fryer-_JM",
    ),
  ).toBe("MLB456789");
});

it("returns undefined when the url has no mlb id", () => {
  expect(
    mlbIdFromUrl("https://www.mercadolivre.com.br/ofertas"),
  ).toBeUndefined();
});

const withJsonLd = `<html><head>
<meta property="og:title" content="OG Title">
<script type="application/ld+json">
{"@type":"Product","name":"Air Fryer Mondial 5L","image":"https://http2.mlstatic.com/D_NQ.jpg","offers":{"@type":"Offer","price":"299.90","priceCurrency":"BRL"}}
</script>
</head><body></body></html>`;

it("extracts product and price from json-ld", () => {
  const deal = parseMercadoLivre(
    withJsonLd,
    "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  );
  expect(deal).toEqual({
    sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
    product: {
      externalId: "MLB123",
      title: "Air Fryer Mondial 5L",
      imageUrl: "https://http2.mlstatic.com/D_NQ.jpg",
    },
    price: { current: 299.9 },
  });
});

const ogOnly = `<html><head>
<meta property="og:title" content="Fone JBL">
<meta property="og:image" content="https://http2.mlstatic.com/jbl.jpg">
</head><body></body></html>`;

it("falls back to open graph tags when json-ld is missing", () => {
  const deal = parseMercadoLivre(
    ogOnly,
    "https://www.mercadolivre.com.br/fone/p/MLB999",
  );
  expect(deal.product.title).toBe("Fone JBL");
  expect(deal.product.imageUrl).toBe("https://http2.mlstatic.com/jbl.jpg");
  expect(deal.price.current).toBeUndefined();
});
