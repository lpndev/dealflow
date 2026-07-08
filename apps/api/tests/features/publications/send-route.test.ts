import { it, expect } from "bun:test";
import app from "@/app";

process.env.DATABASE_URL = ":memory:";

it("returns 400 when no destinations are given", async () => {
  const res = await app.request("/publications/any-id/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ destinationIds: [] }),
  });
  expect(res.status).toBe(400);
});

it("returns 404 for an unknown publication", async () => {
  const res = await app.request("/publications/missing/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ destinationIds: ["dest-0"] }),
  });
  expect(res.status).toBe(404);
});

it("lists destinations", async () => {
  const res = await app.request("/destinations");
  expect(res.status).toBe(200);
  const body = (await res.json()) as { destinations: unknown[] };
  expect(Array.isArray(body.destinations)).toBe(true);
});
