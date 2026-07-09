import { expect, it } from "bun:test";
import { supportsMercadoLivre } from "@/integrations/mercado-livre/source";

it("supports a real mercado livre host", () => {
  expect(supportsMercadoLivre("https://www.mercadolivre.com.br/p/MLB123")).toBe(
    true,
  );
});

it("supports mercado libre short links", () => {
  expect(supportsMercadoLivre("https://mercadolivre.com/sec/abc")).toBe(true);
});

it("supports meli.la affiliate short links", () => {
  expect(supportsMercadoLivre("https://meli.la/xxxxxxx")).toBe(true);
});

it("rejects a url that only mentions mercado livre in the path", () => {
  expect(supportsMercadoLivre("http://169.254.169.254/mercadolivre.com")).toBe(
    false,
  );
});

it("rejects other marketplaces", () => {
  expect(supportsMercadoLivre("https://www.amazon.com.br/dp/B0XYZ")).toBe(
    false,
  );
});

it("rejects malformed urls", () => {
  expect(supportsMercadoLivre("not a url")).toBe(false);
});
