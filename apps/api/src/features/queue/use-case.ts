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

function query(
  db: Db,
  workspaceId: string,
  statuses: (typeof delivery.status.enumValues)[number][],
) {
  return db
    .select(columns)
    .from(delivery)
    .innerJoin(
      publication,
      and(
        eq(delivery.publicationId, publication.id),
        eq(delivery.workspaceId, publication.workspaceId),
      ),
    )
    .innerJoin(
      dealSnapshot,
      and(
        eq(publication.dealId, dealSnapshot.id),
        eq(publication.workspaceId, dealSnapshot.workspaceId),
      ),
    )
    .innerJoin(
      product,
      and(
        eq(dealSnapshot.productId, product.id),
        eq(dealSnapshot.workspaceId, product.workspaceId),
      ),
    )
    .innerJoin(
      destination,
      and(
        eq(delivery.destinationId, destination.id),
        eq(delivery.workspaceId, destination.workspaceId),
      ),
    )
    .where(
      and(
        eq(delivery.workspaceId, workspaceId),
        inArray(delivery.status, statuses),
      ),
    );
}

export function listQueue(db: Db, workspaceId: string): QueueItemRow[] {
  return query(db, workspaceId, ["scheduled", "processing"])
    .orderBy(asc(delivery.dueAt))
    .all();
}

export function listHistory(db: Db, workspaceId: string): QueueItemRow[] {
  return query(db, workspaceId, ["sent", "failed"])
    .orderBy(desc(delivery.sentAt))
    .all();
}

export function isQueuePaused(db: Db, workspaceId: string): boolean {
  return getSettings(db, workspaceId).queuePaused;
}

export function setQueuePaused(
  db: Db,
  workspaceId: string,
  paused: boolean,
): void {
  updateSettings(db, workspaceId, { queuePaused: paused });
}

export function clearHistory(db: Db, workspaceId: string): void {
  db.delete(delivery)
    .where(
      and(
        inArray(delivery.status, ["sent", "failed"]),
        eq(delivery.workspaceId, workspaceId),
      ),
    )
    .run();
}

export function rescheduleDelivery(
  db: Db,
  workspaceId: string,
  id: string,
  dueAt: Date,
): void {
  const row = db
    .select()
    .from(delivery)
    .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
    .get();
  if (!row || row.status !== "scheduled") {
    throw new ScheduleError("only scheduled deliveries can be rescheduled");
  }
  db.update(delivery)
    .set({ dueAt })
    .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
    .run();
}

export function cancelScheduled(db: Db, workspaceId: string, id: string): void {
  const row = db
    .select()
    .from(delivery)
    .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
    .get();
  if (!row || row.status !== "scheduled") {
    throw new ScheduleError("only scheduled deliveries can be cancelled");
  }

  db.delete(delivery)
    .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
    .run();

  const remaining = db
    .select({ id: delivery.id })
    .from(delivery)
    .where(
      and(
        eq(delivery.publicationId, row.publicationId),
        eq(delivery.workspaceId, workspaceId),
      ),
    )
    .all();
  if (remaining.length === 0) {
    db.update(publication)
      .set({ status: "ready" })
      .where(
        and(
          eq(publication.id, row.publicationId),
          eq(publication.workspaceId, workspaceId),
        ),
      )
      .run();
  } else {
    refreshPublicationStatus(db, workspaceId, row.publicationId);
  }
}

export function reorderQueue(
  db: Db,
  workspaceId: string,
  orderedIds: string[],
): void {
  const rows = db
    .select({ id: delivery.id, dueAt: delivery.dueAt })
    .from(delivery)
    .where(
      and(
        inArray(delivery.id, orderedIds),
        eq(delivery.status, "scheduled"),
        eq(delivery.workspaceId, workspaceId),
      ),
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
      .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
      .run();
  });
}
