import type { DeliveryResult } from "@dealflow/shared";
import { and, asc, eq, lte } from "drizzle-orm";
import {
  deliverOne,
  loadPublicationContent,
  refreshPublicationStatus,
} from "@/features/publications/send/deliver";
import { isQueuePaused } from "@/features/queue/use-case";
import type { Db } from "@/shared/db";
import type { MessagingProvider } from "@/shared/messaging";
import { delivery } from "@/shared/schema";

// ponytail: scheduler scans all workspaces; per-workspace fairness only if one operator starves others
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
  if (isQueuePaused(db, due.workspaceId)) return null;

  const pub = loadPublicationContent(db, due.workspaceId, due.publicationId);
  if (!pub) return null;

  const result = await deliverOne(
    db,
    due.workspaceId,
    provider,
    pub,
    due.destinationId,
  );
  refreshPublicationStatus(db, due.workspaceId, due.publicationId);
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
