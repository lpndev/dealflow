import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import {
  cancelScheduled,
  clearHistory,
  isQueuePaused,
  listHistory,
  listQueue,
  reorderQueue,
  rescheduleDelivery,
  setQueuePaused,
} from "./use-case";

export const queue = new Hono();

queue.get("/queue", (c) => {
  const db = getDb();
  return c.json({ items: listQueue(db), paused: isQueuePaused(db) });
});

queue.get("/history", (c) => c.json({ items: listHistory(getDb()) }));

queue.delete("/history", (c) => {
  clearHistory(getDb());
  return c.json({ ok: true });
});

queue.post("/queue/pause", (c) => {
  setQueuePaused(getDb(), true);
  return c.json({ paused: true });
});

queue.post("/queue/resume", (c) => {
  setQueuePaused(getDb(), false);
  return c.json({ paused: false });
});

queue.put("/queue/:id/time", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    dueAt?: unknown;
  } | null;
  const dueAt = typeof body?.dueAt === "string" ? new Date(body.dueAt) : null;
  if (!dueAt || Number.isNaN(dueAt.getTime())) {
    return c.json({ error: "dueAt must be a valid ISO date" }, 400);
  }
  try {
    rescheduleDelivery(getDb(), c.req.param("id"), dueAt);
    return c.json({ items: listQueue(getDb()) });
  } catch (err) {
    if (err instanceof ScheduleError)
      return c.json({ error: err.message }, 409);
    throw err;
  }
});

queue.delete("/queue/:id", (c) => {
  try {
    cancelScheduled(getDb(), c.req.param("id"));
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof ScheduleError)
      return c.json({ error: err.message }, 409);
    throw err;
  }
});

queue.put("/queue/order", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    orderedIds?: unknown;
  } | null;
  if (!Array.isArray(body?.orderedIds)) {
    return c.json({ error: "orderedIds is required" }, 400);
  }
  try {
    reorderQueue(getDb(), body.orderedIds as string[]);
    return c.json({ items: listQueue(getDb()) });
  } catch (err) {
    if (err instanceof ScheduleError)
      return c.json({ error: err.message }, 409);
    throw err;
  }
});
