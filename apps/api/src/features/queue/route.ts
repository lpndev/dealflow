import { Hono } from "hono"
import { requireAuth, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import { ScheduleError } from "@/shared/errors"
import { stringArray } from "@/shared/validate"
import {
  cancelScheduled,
  clearHistory,
  isQueuePaused,
  listHistory,
  listQueue,
  reorderQueue,
  rescheduleDelivery,
  setQueuePaused
} from "./use-case"

export const queue = new Hono<AppEnv>()

queue.use("*", requireAuth)

queue.get("/queue", async (c) => {
  const db = getDb()
  const workspaceId = c.get("workspaceId")
  const [items, paused] = await Promise.all([
    listQueue(db, workspaceId),
    isQueuePaused(db, workspaceId)
  ])
  return c.json({ items, paused })
})

queue.get("/history", async (c) =>
  c.json({ items: await listHistory(getDb(), c.get("workspaceId")) })
)

queue.delete("/history", async (c) => {
  await clearHistory(getDb(), c.get("workspaceId"))
  return c.json({ ok: true })
})

queue.post("/queue/pause", async (c) => {
  await setQueuePaused(getDb(), c.get("workspaceId"), true)
  return c.json({ paused: true })
})

queue.post("/queue/resume", async (c) => {
  await setQueuePaused(getDb(), c.get("workspaceId"), false)
  return c.json({ paused: false })
})

queue.put("/queue/:id/time", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    dueAt?: unknown
  } | null
  const dueAt = typeof body?.dueAt === "string" ? new Date(body.dueAt) : null
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return c.json({ error: "dueAt must be a valid ISO date" }, 400)
  }
  const workspaceId = c.get("workspaceId")
  try {
    await rescheduleDelivery(getDb(), workspaceId, c.req.param("id"), dueAt)
    return c.json({ items: await listQueue(getDb(), workspaceId) })
  } catch (err) {
    if (err instanceof ScheduleError) return c.json({ error: err.message }, 409)
    throw err
  }
})

queue.delete("/queue/:id", async (c) => {
  try {
    await cancelScheduled(getDb(), c.get("workspaceId"), c.req.param("id"))
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ScheduleError) return c.json({ error: err.message }, 409)
    throw err
  }
})

queue.put("/queue/order", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    orderedIds?: unknown
  } | null
  const orderedIds = stringArray(body?.orderedIds)
  if (!orderedIds) {
    return c.json({ error: "orderedIds is required" }, 400)
  }
  const workspaceId = c.get("workspaceId")
  try {
    await reorderQueue(getDb(), workspaceId, orderedIds)
    return c.json({ items: await listQueue(getDb(), workspaceId) })
  } catch (err) {
    if (err instanceof ScheduleError) return c.json({ error: err.message }, 409)
    throw err
  }
})
