import { inArray, and, eq, asc, desc } from "drizzle-orm";
import type { Db } from "@/shared/db";
import {
  delivery,
  publication,
  dealSnapshot,
  product,
  destination,
} from "@/shared/schema";
import { refreshPublicationStatus } from "@/features/publications/send/deliver";
import { ScheduleError } from "@/shared/errors";

export type QueueItem = {
  id: string;
  publicationId: string;
  title: string | null;
  imageUrl: string | null;
  destinationName: string;
  status: string;
  dueAt: Date | null;
  sentAt: Date | null;
  error: string | null;
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

export function listQueue(db: Db): QueueItem[] {
  return query(db)
    .where(inArray(delivery.status, ["scheduled", "processing"]))
    .orderBy(asc(delivery.dueAt))
    .all();
}

export function listHistory(db: Db): QueueItem[] {
  return query(db)
    .where(inArray(delivery.status, ["sent", "failed"]))
    .orderBy(desc(delivery.sentAt))
    .all();
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
  const rows = orderedIds.map((id) => {
    const row = db
      .select()
      .from(delivery)
      .where(and(eq(delivery.id, id), eq(delivery.status, "scheduled")))
      .get();
    if (!row) throw new ScheduleError(`not a scheduled delivery: ${id}`);
    return row;
  });

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
