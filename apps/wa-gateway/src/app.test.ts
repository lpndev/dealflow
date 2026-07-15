import { expect, it } from "bun:test";
import app from "./app";

it("rejects direct requests originating in a browser", async () => {
  const res = await app.request("/health", {
    headers: { origin: "https://attacker.example" },
  });
  expect(res.status).toBe(403);
});

it("keeps server-to-server health checks available", async () => {
  const res = await app.request("/health");
  expect(res.status).toBe(200);
});

it("uses the shared destinationExternalId message contract", async () => {
  const oldContract = await app.request("/sessions/test/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "0@g.us", content: "offer" }),
  });
  expect(oldContract.status).toBe(400);

  const currentContract = await app.request("/sessions/test/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      destinationExternalId: "0@g.us",
      content: "offer",
    }),
  });
  expect(currentContract.status).toBe(502);
  expect(await currentContract.json()).toEqual({ error: "not connected" });
});
