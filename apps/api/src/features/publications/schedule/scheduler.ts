import { and, eq, lte, asc } from "drizzle-orm";
import type { Db } from "@/shared/db";
import type { MessagingProvider } from "@/shared/messaging";
import { delivery } from "@/shared/schema";
import {
  loadPublicationContent,
  deliverOne,
  refreshPublicationStatus,
  type DeliveryResult,
} from "@/features/publications/send/deliver";

export async function dispatchDue(
  db: Db,
  provider: MessagingProvider,
  now: Date = new Date(),
): Promise<DeliveryResult | null> {
  const due = db
    .select()
    .from(delivery)
    .where(and(eq(delivery.status, "scheduled"), lte(delivery.dueAt, now)))
    .orderBy(asc(delivery.dueAt))
    .get();
  if (!due) return null;

  const pub = loadPublicationContent(db, due.publicationId);
  if (!pub) return null;

  const result = await deliverOne(db, provider, pub, due.destinationId);
  refreshPublicationStatus(db, due.publicationId);
  return result;
}

export function startScheduler(
  db: Db,
  provider: MessagingProvider,
  intervalMs = 30_000,
): () => void {
  const timer = setInterval(() => void dispatchDue(db, provider), intervalMs);
  return () => clearInterval(timer);
}
