import type { DeliveryResult } from "@dealflow/shared";
import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "@/shared/db";
import { DeliveryError } from "@/shared/errors";
import type { MessagingProvider } from "@/shared/messaging";
import {
  dealSnapshot,
  delivery,
  destination,
  product,
  publication,
} from "@/shared/schema";

export type PublicationContent = {
  id: string;
  workspaceId: string;
  content: string;
  imageUrl: string | null;
};

export function loadPublicationContent(
  db: Db,
  workspaceId: string,
  publicationId: string,
): PublicationContent | undefined {
  return db
    .select({
      id: publication.id,
      workspaceId: publication.workspaceId,
      content: publication.content,
      imageUrl: product.imageUrl,
    })
    .from(publication)
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
    .where(
      and(
        eq(publication.id, publicationId),
        eq(publication.workspaceId, workspaceId),
      ),
    )
    .get();
}

export function newSendCount(
  db: Db,
  workspaceId: string,
  publicationId: string,
  destinationIds: string[],
): number {
  if (destinationIds.length === 0) return 0;
  const alreadySent = new Set(
    db
      .select({ destinationId: delivery.destinationId })
      .from(delivery)
      .where(
        and(
          eq(delivery.publicationId, publicationId),
          eq(delivery.workspaceId, workspaceId),
          eq(delivery.status, "sent"),
          inArray(delivery.destinationId, destinationIds),
        ),
      )
      .all()
      .map((r) => r.destinationId),
  );
  return destinationIds.filter((id) => !alreadySent.has(id)).length;
}

export async function deliverOne(
  db: Db,
  workspaceId: string,
  provider: MessagingProvider,
  pub: PublicationContent,
  destinationId: string,
  loadedDestination?: typeof destination.$inferSelect,
): Promise<DeliveryResult> {
  const dest =
    loadedDestination ??
    db
      .select()
      .from(destination)
      .where(
        and(
          eq(destination.id, destinationId),
          eq(destination.workspaceId, workspaceId),
        ),
      )
      .get();
  if (!dest) throw new DeliveryError(`destination not found: ${destinationId}`);

  const existing = db
    .select()
    .from(delivery)
    .where(
      and(
        eq(delivery.publicationId, pub.id),
        eq(delivery.destinationId, destinationId),
        eq(delivery.workspaceId, workspaceId),
      ),
    )
    .get();

  if (existing?.status === "sent") {
    return { destinationId, status: "sent" };
  }

  const id = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    db.insert(delivery)
      .values({
        id,
        workspaceId,
        publicationId: pub.id,
        destinationId,
      })
      .run();
  }

  db.update(delivery)
    .set({ status: "processing", attempts: (existing?.attempts ?? 0) + 1 })
    .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
    .run();

  try {
    const { externalMessageId } = await provider.send({
      sessionId: workspaceId,
      destinationExternalId: dest.externalId,
      content: pub.content,
      imageUrl: pub.imageUrl ?? undefined,
    });
    db.update(delivery)
      .set({
        status: "sent",
        externalMessageId,
        error: null,
        sentAt: new Date(),
      })
      .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
      .run();
    return { destinationId, status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    db.update(delivery)
      .set({ status: "failed", error: message })
      .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
      .run();
    return { destinationId, status: "failed", error: message };
  }
}

export function refreshPublicationStatus(
  db: Db,
  workspaceId: string,
  publicationId: string,
): void {
  const rows = db
    .select({ status: delivery.status })
    .from(delivery)
    .where(
      and(
        eq(delivery.publicationId, publicationId),
        eq(delivery.workspaceId, workspaceId),
      ),
    )
    .all();
  const allSent = rows.length > 0 && rows.every((r) => r.status === "sent");
  db.update(publication)
    .set({ status: allSent ? "sent" : "sending" })
    .where(
      and(
        eq(publication.id, publicationId),
        eq(publication.workspaceId, workspaceId),
      ),
    )
    .run();
}
