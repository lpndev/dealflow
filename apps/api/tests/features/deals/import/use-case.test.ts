import { it, expect } from "bun:test";
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
