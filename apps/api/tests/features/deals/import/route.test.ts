import { it, expect } from "bun:test";
import app from "@/app";

async function post(body: unknown) {
  return app.request("/deals/import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

it("returns 400 when input is missing", async () => {
  const res = await post({});
  expect(res.status).toBe(400);
});

it("returns 422 when the input has no supported url", async () => {
  const res = await post({ input: "sem link aqui" });
  expect(res.status).toBe(422);
});
