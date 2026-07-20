import { eq } from "drizzle-orm"
import type { Db } from "@/shared/db"
import { destination, member, publication } from "@/shared/schema"

const LEGACY_WORKSPACE_ID = "default"

export async function resolveActiveWorkspace(
  db: Db,
  userId: string
): Promise<string | null> {
  const existingMembership = await db
    .select()
    .from(member)
    .where(eq(member.userId, userId))
    .get()
  if (existingMembership) return existingMembership.organizationId

  const claimed = await db
    .select()
    .from(member)
    .where(eq(member.organizationId, LEGACY_WORKSPACE_ID))
    .get()
  if (claimed) return null

  const hasDestination = await db
    .select()
    .from(destination)
    .where(eq(destination.workspaceId, LEGACY_WORKSPACE_ID))
    .get()
  const hasPublication = await db
    .select()
    .from(publication)
    .where(eq(publication.workspaceId, LEGACY_WORKSPACE_ID))
    .get()
  if (!hasDestination && !hasPublication) return null

  await db
    .insert(member)
    .values({
      id: crypto.randomUUID(),
      organizationId: LEGACY_WORKSPACE_ID,
      userId,
      role: "owner",
      createdAt: new Date()
    })
    .run()

  return LEGACY_WORKSPACE_ID
}
