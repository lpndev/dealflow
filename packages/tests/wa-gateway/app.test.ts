import { afterEach, expect, it, vi } from "vitest"
import app from "@/app"

afterEach(() => {
  vi.unstubAllEnvs()
})

it("requires the gateway token on every route except health when configured", async () => {
  vi.stubEnv("WA_GATEWAY_TOKEN", "secret-token")

  expect((await app.request("/sessions/test")).status).toBe(401)
  const wrong = await app.request("/sessions/test", {
    headers: { "x-gateway-token": "wrong-token" }
  })
  expect(wrong.status).toBe(401)

  const right = await app.request("/sessions/test", {
    headers: { "x-gateway-token": "secret-token" }
  })
  expect(right.status).toBe(200)
  expect((await app.request("/health")).status).toBe(200)
})

it("stays open without a configured token (local trusted mode)", async () => {
  expect((await app.request("/sessions/test")).status).toBe(200)
})

it("rejects direct requests originating in a browser", async () => {
  const res = await app.request("/health", {
    headers: { origin: "https://attacker.example" }
  })
  expect(res.status).toBe(403)
})

it("keeps server-to-server health checks available", async () => {
  const res = await app.request("/health")
  expect(res.status).toBe(200)
})

it("uses the shared destinationExternalId message contract", async () => {
  const oldContract = await app.request("/sessions/test/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ to: "0@g.us", content: "offer" })
  })
  expect(oldContract.status).toBe(400)

  const currentContract = await app.request("/sessions/test/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      destinationExternalId: "0@g.us",
      content: "offer"
    })
  })
  expect(currentContract.status).toBe(502)
  expect(await currentContract.json()).toEqual({ error: "not connected" })
})
