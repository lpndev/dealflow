import { expect, it } from "vitest"
import app from "@/app"

it("GET /health returns ok", async () => {
  const res = await app.request("/health")
  expect(res.status).toBe(200)
  expect(await res.json()).toEqual({ status: "ok" })
})

it("rejects browser origins outside the trusted web app", async () => {
  const res = await app.request("/health", {
    headers: { origin: "https://attacker.example" }
  })
  expect(res.status).toBe(403)
})

it("rejects oversized request bodies", async () => {
  const res = await app.request("/health", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "x".repeat(256 * 1024 + 1)
  })
  expect(res.status).toBe(413)
})
