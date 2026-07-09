import { expect, it } from "bun:test";
import { importDeal } from "@/features/deals/import/use-case";
import { ImportError } from "@/shared/errors";

const html = `<html><head>
<script type="application/ld+json">
{"@type":"Product","name":"Air Fryer","image":"https://img/a.jpg","offers":{"price":"299.90"}}
</script>
</head></html>`;

it("imports a draft from a mercado livre message", async () => {
  const input =
    "🔥 Air Fryer\nhttps://www.mercadolivre.com.br/air-fryer/p/MLB123";
  const deal = await importDeal(input, async () => html);

  expect(deal.sourceUrl).toBe(
    "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  );
  expect(deal.product.title).toBe("Air Fryer");
  expect(deal.price.current).toBe(299.9);
});

it("fills coupon and de/por prices from the message text", async () => {
  const input =
    "🔥 Air Fryer\nDe R$ 399 por R$ 299,90\nCupom: AIR10\nhttps://www.mercadolivre.com.br/air-fryer/p/MLB123";
  const deal = await importDeal(input, async () => html);

  expect(deal.price.original).toBe(399);
  expect(deal.price.current).toBe(299.9);
  expect(deal.coupon).toBe("AIR10");
});

it("rejects input without any url", async () => {
  expect(importDeal("sem link", async () => html)).rejects.toBeInstanceOf(
    ImportError,
  );
});

it("rejects a url from an unsupported marketplace", async () => {
  expect(
    importDeal("https://www.amazon.com.br/dp/B0XYZ", async () => html),
  ).rejects.toBeInstanceOf(ImportError);
});

const socialHtml = `<html><head>
<meta property="og:title" content="Jogo Soquete">
</head><body>
<a href="https://www.mercadolivre.com.br/jogo/p/MLB63558681?ref=aff">Ir para produto</a>
</body></html>`;

const productHtml = `<html><head>
<script type="application/ld+json">
{"@type":"Product","name":"Jogo Soquete","image":"https://img/s.jpg","offers":{"price":"189.96"}}
</script></head></html>`;

it("resolves an affiliate link to the product and prefills the affiliate url", async () => {
  const fetchByUrl = async (u: string) => {
    if (u.includes("meli.la")) return socialHtml;
    if (u.includes("MLB63558681")) return productHtml;
    return "";
  };
  const deal = await importDeal("https://meli.la/xxxxxxx", fetchByUrl);

  expect(deal.affiliateUrl).toBe("https://meli.la/xxxxxxx");
  expect(deal.sourceUrl).toBe(
    "https://www.mercadolivre.com.br/jogo/p/MLB63558681",
  );
  expect(deal.product.title).toBe("Jogo Soquete");
  expect(deal.price.current).toBe(189.96);
});

it("keeps title and image from the landing when the product page is blocked", async () => {
  const socialWithOg = `<html><head>
<meta property="og:title" content="Jogo Soquete 35pcs">
<meta property="og:image" content="https://img/soquete.webp">
</head><body>
<a href="https://www.mercadolivre.com.br/jogo/p/MLB63558681">produto</a>
</body></html>`;
  const blocked = `<html><body>anti-bot challenge, no data</body></html>`;
  const fetchByUrl = async (u: string) =>
    u.includes("meli.la") ? socialWithOg : blocked;
  const deal = await importDeal("https://meli.la/xxx", fetchByUrl);

  expect(deal.product.title).toBe("Jogo Soquete 35pcs");
  expect(deal.product.imageUrl).toBe("https://img/soquete.webp");
  expect(deal.product.externalId).toBe("MLB63558681");
  expect(deal.affiliateUrl).toBe("https://meli.la/xxx");
});

it("falls back to landing og data when the product link is missing", async () => {
  const landing = `<html><head><meta property="og:title" content="Só OG"></head></html>`;
  const deal = await importDeal("https://meli.la/xxx", async () => landing);

  expect(deal.affiliateUrl).toBe("https://meli.la/xxx");
  expect(deal.product.title).toBe("Só OG");
  expect(deal.price.current).toBeUndefined();
});

it("leaves affiliate url unset for a direct product paste", async () => {
  const deal = await importDeal(
    "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
    async () => html,
  );
  expect(deal.affiliateUrl).toBeUndefined();
});
