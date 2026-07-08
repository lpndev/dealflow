import { it, expect } from "bun:test";
import app from "@/app";

process.env.DATABASE_URL = ":memory:";

async function post(path: string, body: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const valid = {
  title: "Air Fryer",
  currentPrice: "299,90",
  sourceUrl: "https://www.mercadolivre.com.br/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours",
};

it("previews a publication", async () => {
  const res = await post("/publications/preview", valid);
  expect(res.status).toBe(200);
  const body = (await res.json()) as { content: string };
  expect(body.content).toContain("💰 *Por R$ 299,90*");
});

it("creates a publication", async () => {
  const res = await post("/publications", valid);
  expect(res.status).toBe(201);
  const body = (await res.json()) as { status: string };
  expect(body.status).toBe("ready");
});

it("returns 400 when the affiliate link is missing", async () => {
  const res = await post("/publications", { ...valid, affiliateUrl: "" });
  expect(res.status).toBe(400);
});
