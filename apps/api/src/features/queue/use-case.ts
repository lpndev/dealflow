import type { QueueItem } from "@dealflow/shared";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { refreshPublicationStatus } from "@/features/publications/send/deliver";
import { getSettings, updateSettings } from "@/features/settings/use-case";
import type { Db } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import {
  dealSnapshot,
  delivery,
  destination,
  product,
  publication,
} from "@/shared/schema";

type QueueItemRow = Omit<QueueItem, "dueAt" | "sentAt"> & {
  dueAt: Date | null;
  sentAt: Date | null;
};

const columns = {
  id: delivery.id,
  publicationId: delivery.publicationId,
  title: product.title,
  imageUrl: product.imageUrl,
  destinationName: destination.name,
  status: delivery.status,
  dueAt: delivery.dueAt,
  sentAt: delivery.sentAt,
  error: delivery.error,
};

function query(db: Db) {
  return db
    .select(columns)
    .from(delivery)
    .innerJoin(publication, eq(delivery.publicationId, publication.id))
    .innerJoin(dealSnapshot, eq(publication.dealId, dealSnapshot.id))
    .innerJoin(product, eq(dealSnapshot.productId, product.id))
    .innerJoin(destination, eq(delivery.destinationId, destination.id));
}

export function listQueue(db: Db): QueueItemRow[] {
  return query(db)
    .where(inArray(delivery.status, ["scheduled", "processing"]))
    .orderBy(asc(delivery.dueAt))
    .all();
}

export function listHistory(db: Db): QueueItemRow[] {
  return query(db)
    .where(inArray(delivery.status, ["sent", "failed"]))
    .orderBy(desc(delivery.sentAt))
    .all();
}

export function isQueuePaused(db: Db): boolean {
  return getSettings(db).queuePaused;
}

export function setQueuePaused(db: Db, paused: boolean): void {
  updateSettings(db, { queuePaused: paused });
}

export function clearHistory(db: Db): void {
  db.delete(delivery)
    .where(inArray(delivery.status, ["sent", "failed"]))
    .run();
}

export function rescheduleDelivery(db: Db, id: string, dueAt: Date): void {
  const row = db.select().from(delivery).where(eq(delivery.id, id)).get();
  if (!row || row.status !== "scheduled") {
    throw new ScheduleError("only scheduled deliveries can be rescheduled");
  }
  db.update(delivery).set({ dueAt }).where(eq(delivery.id, id)).run();
}

export function cancelScheduled(db: Db, id: string): void {
  const row = db.select().from(delivery).where(eq(delivery.id, id)).get();
  if (!row || row.status !== "scheduled") {
    throw new ScheduleError("only scheduled deliveries can be cancelled");
  }

  db.delete(delivery).where(eq(delivery.id, id)).run();

  const remaining = db
    .select({ id: delivery.id })
    .from(delivery)
    .where(eq(delivery.publicationId, row.publicationId))
    .all();
  if (remaining.length === 0) {
    db.update(publication)
      .set({ status: "ready" })
      .where(eq(publication.id, row.publicationId))
      .run();
  } else {
    refreshPublicationStatus(db, row.publicationId);
  }
}

export function reorderQueue(db: Db, orderedIds: string[]): void {
  const rows = db
    .select({ id: delivery.id, dueAt: delivery.dueAt })
    .from(delivery)
    .where(
      and(inArray(delivery.id, orderedIds), eq(delivery.status, "scheduled")),
    )
    .all();

  const found = new Set(rows.map((r) => r.id));
  const missing = orderedIds.find((id) => !found.has(id));
  if (missing) throw new ScheduleError(`not a scheduled delivery: ${missing}`);

  const slots = rows
    .map((r) => r.dueAt)
    .sort((a, b) => (a?.getTime() ?? 0) - (b?.getTime() ?? 0));

  orderedIds.forEach((id, i) => {
    db.update(delivery)
      .set({ dueAt: slots[i] })
      .where(eq(delivery.id, id))
      .run();
  });
}
