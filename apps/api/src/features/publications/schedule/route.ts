import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import { schedulePublication } from "./use-case";

export const schedule = new Hono();

schedule.post("/:id/schedule", async (c) => {
  const publicationId = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as {
    destinationIds?: unknown;
  } | null;
  const destinationIds = body?.destinationIds;

  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    return c.json({ error: "destinationIds is required" }, 400);
  }

  try {
    const scheduled = schedulePublication(
      { publicationId, destinationIds: destinationIds as string[] },
      getDb(),
    );
    return c.json({ scheduled });
  } catch (err) {
    if (err instanceof ScheduleError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});
