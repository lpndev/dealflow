import type { DeliveryResult } from "@dealflow/shared";
import { and, asc, eq, lte, notInArray } from "drizzle-orm";
import {
  deliverOne,
  loadPublicationContent,
  refreshPublicationStatus,
} from "@/features/publications/send/deliver";
import type { Db } from "@/shared/db";
import type { MessagingProvider } from "@/shared/messaging";
import { delivery, settings } from "@/shared/schema";

export async function dispatchDue(
  db: Db,
  provider: MessagingProvider,
  now: Date = new Date(),
): Promise<DeliveryResult | null> {
  const pausedWorkspaces = db
    .select({ workspaceId: settings.workspaceId })
    .from(settings)
    .where(eq(settings.queuePaused, true));

  const due = db
    .select()
    .from(delivery)
    .where(
      and(
        eq(delivery.status, "scheduled"),
        lte(delivery.dueAt, now),
        notInArray(delivery.workspaceId, pausedWorkspaces),
      ),
    )
    .orderBy(asc(delivery.dueAt))
    .get();
  if (!due) return null;

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
