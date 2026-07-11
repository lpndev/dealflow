import { Hono } from "hono";
import { requireAuth, type AppEnv } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import { schedulePublication } from "./use-case";

export const schedule = new Hono<AppEnv>();

schedule.use("*", requireAuth);

schedule.post("/:id/schedule", async (c) => {
  const publicationId = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as {
    destinationIds?: unknown;
    startAt?: unknown;
  } | null;
  const destinationIds = body?.destinationIds;

  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    return c.json({ error: "destinationIds is required" }, 400);
  }

  let startAt: Date | undefined;
  if (body?.startAt != null) {
    const parsed = new Date(String(body.startAt));
    if (Number.isNaN(parsed.getTime())) {
      return c.json({ error: "startAt is not a valid date" }, 400);
    }
    startAt = parsed;
  }

  try {
    const scheduled = schedulePublication(
      { publicationId, destinationIds: destinationIds as string[], startAt },
      getDb(),
      c.get("workspaceId"),
    );
    return c.json({ scheduled });
  } catch (err) {
    if (err instanceof ScheduleError)
      return c.json({ error: err.message }, 404);
    throw err;
  }
});
