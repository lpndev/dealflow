import type { DeliveryResult } from "@dealflow/shared";
import { and, eq } from "drizzle-orm";
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
    .innerJoin(dealSnapshot, eq(publication.dealId, dealSnapshot.id))
    .innerJoin(product, eq(dealSnapshot.productId, product.id))
    .where(eq(publication.id, publicationId))
    .get();
}

export async function deliverOne(
  db: Db,
  provider: MessagingProvider,
  pub: PublicationContent,
  destinationId: string,
): Promise<DeliveryResult> {
  const dest = db
    .select()
    .from(destination)
    .where(eq(destination.id, destinationId))
    .get();
  if (!dest) throw new DeliveryError(`destination not found: ${destinationId}`);

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

  if (existing?.status === "sent") {
    return { destinationId, status: "sent" };
  }

  const id = existing?.id ?? crypto.randomUUID();
  if (!existing) {
    db.insert(delivery)
      .values({
        id,
        workspaceId: pub.workspaceId,
        publicationId: pub.id,
        destinationId,
      })
      .run();
  }

  db.update(delivery)
    .set({ status: "processing", attempts: (existing?.attempts ?? 0) + 1 })
    .where(eq(delivery.id, id))
    .run();

  try {
    const { externalMessageId } = await provider.send({
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
      .where(eq(delivery.id, id))
      .run();
    return { destinationId, status: "sent" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    db.update(delivery)
      .set({ status: "failed", error: message })
      .where(eq(delivery.id, id))
      .run();
    return { destinationId, status: "failed", error: message };
  }
}

export function refreshPublicationStatus(db: Db, publicationId: string): void {
  const rows = db
    .select({ status: delivery.status })
    .from(delivery)
    .where(eq(delivery.publicationId, publicationId))
    .all();
  const allSent = rows.length > 0 && rows.every((r) => r.status === "sent");
  db.update(publication)
    .set({ status: allSent ? "sent" : "sending" })
    .where(eq(publication.id, publicationId))
    .run();
}
