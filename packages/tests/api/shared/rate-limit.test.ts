import { Hono, type Context, type Next } from "hono"
import { afterEach, expect, it, vi } from "vitest"
import type { AppEnv } from "@/shared/auth"
import { rateLimit } from "@/shared/rate-limit"

function appWithLimit(max: number, windowSeconds: number) {
  const app = new Hono<AppEnv>()
  app.use("*", async (c: Context<AppEnv>, next: Next) => {
    c.set("workspaceId", c.req.header("x-ws") ?? "ws-a")
    await next()
  })
  app.get("/x", rateLimit(max, windowSeconds), (c: Context<AppEnv>) =>
    c.json({ ok: true })
  )
  return app
}

afterEach(() => {
  vi.useRealTimers()
})

it("limits requests per workspace within the window", async () => {
  const app = appWithLimit(3, 60)
  for (let i = 0; i < 3; i += 1) {
    expect((await app.request("/x")).status).toBe(200)
  }
  expect((await app.request("/x")).status).toBe(429)

  const otherWorkspace = await app.request("/x", {
    headers: { "x-ws": "ws-b" }
  })
  expect(otherWorkspace.status).toBe(200)
})

it("resets the counter after the window passes", async () => {
  vi.useFakeTimers()
  const app = appWithLimit(1, 60)
  expect((await app.request("/x")).status).toBe(200)
  expect((await app.request("/x")).status).toBe(429)

  vi.advanceTimersByTime(61_000)
  expect((await app.request("/x")).status).toBe(200)
})
