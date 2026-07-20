import { and, eq, inArray } from "drizzle-orm"
import type { Db } from "@/shared/db"
import type { MessagingProvider } from "@/shared/messaging"
import {
  assertCanEnableDestination,
  destinationSlotsLeft
} from "@/shared/plans"
import { destination } from "@/shared/schema"

export function listDestinations(db: Db, workspaceId: string) {
  return db
    .select()
    .from(destination)
    .where(eq(destination.workspaceId, workspaceId))
    .all()
}

export function publicDestinations(
  rows: Awaited<ReturnType<typeof listDestinations>>
) {
  return rows.map(({ id, name, enabled }) => ({ id, name, enabled }))
}

export async function listDestinationsByIds(
  db: Db,
  workspaceId: string,
  ids: string[]
) {
  if (ids.length === 0) return []
  return db
    .select()
    .from(destination)
    .where(
      and(
        eq(destination.workspaceId, workspaceId),
        inArray(destination.id, ids)
      )
    )
    .all()
}

export async function setDestinationEnabled(
  db: Db,
  workspaceId: string,
  id: string,
  enabled: boolean
) {
  if (enabled) await assertCanEnableDestination(db, workspaceId)
  await db
    .update(destination)
    .set({ enabled })
    .where(
      and(eq(destination.id, id), eq(destination.workspaceId, workspaceId))
    )
    .run()
  return listDestinations(db, workspaceId)
}

export async function syncDestinations(
  db: Db,
  workspaceId: string,
  provider: MessagingProvider
) {
  const [groups, slots, known] = await Promise.all([
    provider.listGroups(workspaceId),
    destinationSlotsLeft(db, workspaceId),
    listDestinations(db, workspaceId)
  ])
  let slotsLeft = slots
  const byExternalId = new Map(
    known.map((row) => [`${row.provider}:${row.externalId}`, row])
  )

  for (const group of groups) {
    const existing = byExternalId.get(`${group.provider}:${group.externalId}`)

    if (existing) {
      if (existing.name === group.name) continue
      await db
        .update(destination)
        .set({ name: group.name })
        .where(
          and(
            eq(destination.id, existing.id),
            eq(destination.workspaceId, workspaceId)
          )
        )
        .run()
    } else {
      const enabled = slotsLeft > 0
      if (enabled) slotsLeft -= 1
      await db
        .insert(destination)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          provider: group.provider,
          externalId: group.externalId,
          name: group.name,
          enabled
        })
        .run()
    }
  }

  return listDestinations(db, workspaceId)
}
