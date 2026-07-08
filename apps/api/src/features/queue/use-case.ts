import { inArray, eq, asc, desc } from "drizzle-orm";
import type { Db } from "@/shared/db";
import {
  delivery,
  publication,
  dealSnapshot,
  product,
  destination,
} from "@/shared/schema";

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
