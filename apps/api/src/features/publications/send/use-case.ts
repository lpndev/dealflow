import type { DeliveryResult } from "@dealflow/shared"
import { listDestinationsByIds } from "@/features/destinations/use-case"
import type { Db } from "@/shared/db"
import { DeliveryError } from "@/shared/errors"
import type { MessagingProvider } from "@/shared/messaging"
import { assertCanSend } from "@/shared/plans"
import {
  deliverOne,
  loadPublicationContent,
  newSendCount,
  refreshPublicationStatus
} from "./deliver"

export type SendInput = {
  publicationId: string
  destinationIds: string[]
}

export async function sendPublication(
  input: SendInput,
  db: Db,
  workspaceId: string,
  provider: MessagingProvider
): Promise<DeliveryResult[]> {
  const pub = await loadPublicationContent(db, workspaceId, input.publicationId)
  if (!pub) throw new DeliveryError("publication not found")

  const destinationIds = [...new Set(input.destinationIds)]
  const destinations = await listDestinationsByIds(
    db,
    workspaceId,
    destinationIds
  )
  const byId = new Map(destinations.map((item) => [item.id, item]))
  const missing = destinationIds.find((id) => !byId.has(id))
  if (missing) throw new DeliveryError(`destination not found: ${missing}`)

  await assertCanSend(
    db,
    workspaceId,
    await newSendCount(db, workspaceId, pub.id, destinationIds)
  )

  const results: DeliveryResult[] = []
  for (const destinationId of destinationIds) {
    results.push(
      await deliverOne(
        db,
        workspaceId,
        provider,
        pub,
        destinationId,
        byId.get(destinationId)
      )
    )
  }

  await refreshPublicationStatus(db, workspaceId, pub.id)
  return results
}
