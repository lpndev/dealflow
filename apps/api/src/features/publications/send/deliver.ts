import type { DeliveryResult } from "@dealflow/shared"
import { and, eq, inArray, notInArray, sql } from "drizzle-orm"
import type { Db } from "@/shared/db"
import { DeliveryError } from "@/shared/errors"
import type { MessagingProvider } from "@/shared/messaging"
import {
  dealSnapshot,
  delivery,
  destination,
  product,
  publication
} from "@/shared/schema"

export type PublicationContent = {
  id: string
  workspaceId: string
  content: string
  imageUrl: string | null
}

export function loadPublicationContent(
  db: Db,
  workspaceId: string,
  publicationId: string
): Promise<PublicationContent | undefined> {
  return db
    .select({
      id: publication.id,
      workspaceId: publication.workspaceId,
      content: publication.content,
      imageUrl: product.imageUrl
    })
    .from(publication)
    .innerJoin(
      dealSnapshot,
      and(
        eq(publication.dealId, dealSnapshot.id),
        eq(publication.workspaceId, dealSnapshot.workspaceId)
      )
    )
    .innerJoin(
      product,
      and(
        eq(dealSnapshot.productId, product.id),
        eq(dealSnapshot.workspaceId, product.workspaceId)
      )
    )
    .where(
      and(
        eq(publication.id, publicationId),
        eq(publication.workspaceId, workspaceId)
      )
    )
    .get()
}

export async function newSendCount(
  db: Db,
  workspaceId: string,
  publicationId: string,
  destinationIds: string[]
): Promise<number> {
  if (destinationIds.length === 0) return 0
  const rows = await db
    .select({ destinationId: delivery.destinationId })
    .from(delivery)
    .where(
      and(
        eq(delivery.publicationId, publicationId),
        eq(delivery.workspaceId, workspaceId),
        eq(delivery.status, "sent"),
        inArray(delivery.destinationId, destinationIds)
      )
    )
    .all()
  const alreadySent = new Set(rows.map((r) => r.destinationId))
  return destinationIds.filter((id) => !alreadySent.has(id)).length
}

function findDelivery(
  db: Db,
  workspaceId: string,
  publicationId: string,
  destinationId: string
): Promise<typeof delivery.$inferSelect | undefined> {
  return db
    .select()
    .from(delivery)
    .where(
      and(
        eq(delivery.publicationId, publicationId),
        eq(delivery.destinationId, destinationId),
        eq(delivery.workspaceId, workspaceId)
      )
    )
    .get()
}

type DeliveryClaim =
  { claimed: true; id: string } | { claimed: false; result: DeliveryResult }

async function claimDelivery(
  db: Db,
  workspaceId: string,
  publicationId: string,
  destinationId: string
): Promise<DeliveryClaim> {
  await db
    .insert(delivery)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      publicationId,
      destinationId
    })
    .onConflictDoNothing()
    .run()

  const [claimed] = await db
    .update(delivery)
    .set({
      status: "processing",
      attempts: sql`${delivery.attempts} + 1`
    })
    .where(
      and(
        eq(delivery.publicationId, publicationId),
        eq(delivery.destinationId, destinationId),
        eq(delivery.workspaceId, workspaceId),
        notInArray(delivery.status, ["sent", "processing"])
      )
    )
    .returning({ id: delivery.id })
  if (claimed) return { claimed: true, id: claimed.id }

  const current = await findDelivery(
    db,
    workspaceId,
    publicationId,
    destinationId
  )
  return {
    claimed: false,
    result:
      current?.status === "sent"
        ? { destinationId, status: "sent" }
        : {
            destinationId,
            status: "failed",
            error: "send already in progress"
          }
  }
}

export async function deliverOne(
  db: Db,
  workspaceId: string,
  provider: MessagingProvider,
  pub: PublicationContent,
  destinationId: string,
  loadedDestination?: typeof destination.$inferSelect
): Promise<DeliveryResult> {
  const dest =
    loadedDestination ??
    (await db
      .select()
      .from(destination)
      .where(
        and(
          eq(destination.id, destinationId),
          eq(destination.workspaceId, workspaceId)
        )
      )
      .get())
  if (!dest) throw new DeliveryError(`destination not found: ${destinationId}`)

  const claim = await claimDelivery(db, workspaceId, pub.id, destinationId)
  if (!claim.claimed) return claim.result
  const id = claim.id

  try {
    const { externalMessageId } = await provider.send({
      sessionId: workspaceId,
      destinationExternalId: dest.externalId,
      content: pub.content,
      imageUrl: pub.imageUrl ?? undefined
    })
    await db
      .update(delivery)
      .set({
        status: "sent",
        externalMessageId,
        error: null,
        sentAt: new Date()
      })
      .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
      .run()
    return { destinationId, status: "sent" }
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed"
    await db
      .update(delivery)
      .set({ status: "failed", error: message })
      .where(and(eq(delivery.id, id), eq(delivery.workspaceId, workspaceId)))
      .run()
    return { destinationId, status: "failed", error: message }
  }
}

export async function refreshPublicationStatus(
  db: Db,
  workspaceId: string,
  publicationId: string
): Promise<void> {
  const rows = await db
    .select({ status: delivery.status })
    .from(delivery)
    .where(
      and(
        eq(delivery.publicationId, publicationId),
        eq(delivery.workspaceId, workspaceId)
      )
    )
    .all()
  const allSent = rows.length > 0 && rows.every((r) => r.status === "sent")
  await db
    .update(publication)
    .set({ status: allSent ? "sent" : "sending" })
    .where(
      and(
        eq(publication.id, publicationId),
        eq(publication.workspaceId, workspaceId)
      )
    )
    .run()
}
