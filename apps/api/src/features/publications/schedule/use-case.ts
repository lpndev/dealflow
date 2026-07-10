import { and, desc, eq } from "drizzle-orm";
import { getSettings } from "@/features/settings/use-case";
import type { Db } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import { delivery, destination, publication } from "@/shared/schema";

export type ScheduleInput = {
  publicationId: string;
  destinationIds: string[];
  startAt?: Date;
};

export type ScheduledDelivery = {
  destinationId: string;
  dueAt: Date;
};

type Options = {
  now?: Date;
  rand?: () => number;
};

export function schedulePublication(
  input: ScheduleInput,
  db: Db,
  opts: Options = {},
): ScheduledDelivery[] {
  const now = opts.now ?? new Date();
  const rand = opts.rand ?? Math.random;

  const pub = db
    .select()
    .from(publication)
    .where(eq(publication.id, input.publicationId))
    .get();
  if (!pub) throw new ScheduleError("publication not found");

  const { delayMinSeconds, delayMaxSeconds } = getSettings(db);

  const startMs = Math.max(now.getTime(), input.startAt?.getTime() ?? 0);
  const tail = queueTail(db);
  let cursor: number | null = null;
  const scheduled: ScheduledDelivery[] = [];

  for (const destinationId of input.destinationIds) {
    const dest = db
      .select()
      .from(destination)
      .where(eq(destination.id, destinationId))
      .get();
    if (!dest)
      throw new ScheduleError(`destination not found: ${destinationId}`);

    const existing = db
      .select()
      .from(delivery)
      .where(
        and(
          eq(delivery.publicationId, pub.id),
          eq(delivery.destinationId, destinationId),
        ),
      )
      .get();
    if (existing) continue;

    const gap = randomDelay(delayMinSeconds, delayMaxSeconds, rand) * 1000;
    if (cursor === null) {
      cursor = tail === null ? startMs : Math.max(startMs, tail + gap);
    } else {
      cursor += gap;
    }
    const dueAt = new Date(cursor);
    db.insert(delivery)
      .values({
        id: crypto.randomUUID(),
        workspaceId: pub.workspaceId,
        publicationId: pub.id,
        destinationId,
        status: "scheduled",
        dueAt,
      })
      .run();
    scheduled.push({ destinationId, dueAt });
  }

  if (scheduled.length > 0) {
    db.update(publication)
      .set({ status: "sending" })
      .where(eq(publication.id, pub.id))
      .run();
  }

  return scheduled;
}

function queueTail(db: Db): number | null {
  const last = db
    .select({ dueAt: delivery.dueAt })
    .from(delivery)
    .where(eq(delivery.status, "scheduled"))
    .orderBy(desc(delivery.dueAt))
    .get();
  return last?.dueAt?.getTime() ?? null;
}

function randomDelay(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
