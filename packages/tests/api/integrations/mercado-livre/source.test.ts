import { expect, it } from "vitest";
import {
  realFetchMercadoLivre,
  supportsMercadoLivre,
} from "@/integrations/mercado-livre/source";

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

it("does not follow a marketplace redirect to an internal service", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(null, {
      status: 302,
      headers: { location: "http://127.0.0.1:3002/sessions/secret" },
    })) as unknown as typeof fetch;
  try {
    await expect(
      realFetchMercadoLivre("https://meli.la/xxxxxxx"),
    ).rejects.toThrow("unsupported marketplace redirect");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
