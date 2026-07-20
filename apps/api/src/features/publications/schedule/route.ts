import { Hono } from "hono"
import { requireAuth, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import { PlanLimitError, ScheduleError } from "@/shared/errors"
import { rateLimit } from "@/shared/rate-limit"
import { nonEmptyStringArray } from "@/shared/validate"
import { schedulePublication } from "./use-case"

export const schedule = new Hono<AppEnv>()

schedule.use("*", requireAuth)

schedule.post("/:id/schedule", rateLimit(20, 60), async (c) => {
  const publicationId = c.req.param("id")
  const body = (await c.req.json().catch(() => null)) as {
    destinationIds?: unknown
    startAt?: unknown
  } | null
  const destinationIds = nonEmptyStringArray(body?.destinationIds)

  if (!destinationIds) {
    return c.json({ error: "destinationIds is required" }, 400)
  }

  let startAt: Date | undefined
  if (body?.startAt != null) {
    if (typeof body.startAt !== "string") {
      return c.json({ error: "startAt is not a valid date" }, 400)
    }
    const parsed = new Date(body.startAt)
    if (Number.isNaN(parsed.getTime())) {
      return c.json({ error: "startAt is not a valid date" }, 400)
    }
    startAt = parsed
  }

  try {
    const scheduled = schedulePublication(
      { publicationId, destinationIds, startAt },
      getDb(),
      c.get("workspaceId")
    )
    return c.json({ scheduled })
  } catch (err) {
    if (err instanceof PlanLimitError)
      return c.json({ error: err.message }, 402)
    if (err instanceof ScheduleError) return c.json({ error: err.message }, 404)
    throw err
  }
})
