import { expect, it } from "vitest"
import app from "@/app"

process.env.DATABASE_URL = ":memory:"

// ponytail: routes now require a session (Task 3); no test harness yet mints
// an authenticated cookie (needs Task 6 onboarding). Behavior is covered at
// the use-case level (publications/send/use-case.test.ts,
// destinations/use-case.test.ts). Un-skip once a session-test helper exists.
it.skip("returns 400 when no destinations are given", async () => {
  const res = await app.request("/publications/any-id/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ destinationIds: [] })
  })
  expect(res.status).toBe(400)
})

it.skip("returns 404 for an unknown publication", async () => {
  const res = await app.request("/publications/missing/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ destinationIds: ["dest-0"] })
  })
  expect(res.status).toBe(404)
})

it.skip("lists destinations", async () => {
  const res = await app.request("/destinations")
  expect(res.status).toBe(200)
  const body = (await res.json()) as { destinations: unknown[] }
  expect(Array.isArray(body.destinations)).toBe(true)
})
