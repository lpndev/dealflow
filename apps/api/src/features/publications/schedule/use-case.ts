import { and, desc, eq, inArray } from "drizzle-orm";
import { listDestinationsByIds } from "@/features/destinations/use-case";
import { getSettings } from "@/features/settings/use-case";
import type { Db } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import { assertCanSend } from "@/shared/plans";
import { delivery, publication } from "@/shared/schema";

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
  workspaceId: string,
  opts: Options = {},
): ScheduledDelivery[] {
  const now = opts.now ?? new Date();
  const rand = opts.rand ?? Math.random;

  const pub = db
    .select()
    .from(publication)
    .where(
      and(
        eq(publication.id, input.publicationId),
        eq(publication.workspaceId, workspaceId),
      ),
    )
    .get();
  if (!pub) throw new ScheduleError("publication not found");

  const destinationIds = [...new Set(input.destinationIds)];
  const destinations = listDestinationsByIds(db, workspaceId, destinationIds);
  const foundIds = new Set(destinations.map((item) => item.id));
  const missing = destinationIds.find((id) => !foundIds.has(id));
  if (missing) throw new ScheduleError(`destination not found: ${missing}`);

  const existingIds = new Set(
    destinationIds.length === 0
      ? []
      : db
          .select({ destinationId: delivery.destinationId })
          .from(delivery)
          .where(
            and(
              eq(delivery.publicationId, pub.id),
              eq(delivery.workspaceId, workspaceId),
              inArray(delivery.destinationId, destinationIds),
            ),
          )
          .all()
          .map((item) => item.destinationId),
  );

  const newCount = destinationIds.filter((id) => !existingIds.has(id)).length;
  assertCanSend(db, workspaceId, newCount, now);

  const { delayMinSeconds, delayMaxSeconds } = getSettings(db, workspaceId);

  const startMs = Math.max(now.getTime(), input.startAt?.getTime() ?? 0);
  const tail = queueTail(db, workspaceId);
  let cursor: number | null = null;
  const scheduled: ScheduledDelivery[] = [];

  for (const destinationId of destinationIds) {
    if (existingIds.has(destinationId)) continue;

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

function queueTail(db: Db, workspaceId: string): number | null {
  const last = db
    .select({ dueAt: delivery.dueAt })
    .from(delivery)
    .where(
      and(
        eq(delivery.status, "scheduled"),
        eq(delivery.workspaceId, workspaceId),
      ),
    )
    .orderBy(desc(delivery.dueAt))
    .get();
  return last?.dueAt?.getTime() ?? null;
}

function randomDelay(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}
