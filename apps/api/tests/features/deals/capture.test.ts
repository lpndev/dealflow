import { it, expect } from "bun:test";
import app from "@/app";

const draft = {
  sourceUrl: "https://www.mercadolivre.com.br/x/p/MLB123",
  affiliateUrl: "https://meli.la/abc",
  product: { externalId: "MLB123", title: "Furadeira" },
  price: { original: 597.02, current: 197.02 },
};

async function post(body: unknown) {
  return app.request("/deals/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

it("stores a captured draft and hands it off once", async () => {
  expect((await post({ draft })).status).toBe(200);

  const first = (await (await app.request("/deals/capture")).json()) as {
    draft: unknown;
  };
  expect(first.draft).toEqual(draft);

  const second = (await (await app.request("/deals/capture")).json()) as {
    draft: unknown;
  };
  expect(second.draft).toBeNull();
});

it("rejects a capture without an affiliate link", async () => {
  const res = await post({ draft: { ...draft, affiliateUrl: undefined } });
  expect(res.status).toBe(400);
});
