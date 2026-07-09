import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import {
  cancelScheduled,
  listHistory,
  listQueue,
  reorderQueue,
} from "./use-case";

export const queue = new Hono();

queue.get("/queue", (c) => c.json({ items: listQueue(getDb()) }));

queue.get("/history", (c) => c.json({ items: listHistory(getDb()) }));

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
