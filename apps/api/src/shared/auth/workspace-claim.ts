import { eq } from "drizzle-orm"
import type { Db } from "@/shared/db"
import { destination, member, publication } from "@/shared/schema"

const LEGACY_WORKSPACE_ID = "default"

export function resolveActiveWorkspace(db: Db, userId: string): string | null {
  const existingMembership = db
    .select()
    .from(member)
    .where(eq(member.userId, userId))
    .get()
  if (existingMembership) return existingMembership.organizationId

  const claimed = db
    .select()
    .from(member)
    .where(eq(member.organizationId, LEGACY_WORKSPACE_ID))
    .get()
  if (claimed) return null

  const hasDestination = db
    .select()
    .from(destination)
    .where(eq(destination.workspaceId, LEGACY_WORKSPACE_ID))
    .get()
  const hasPublication = db
    .select()
    .from(publication)
    .where(eq(publication.workspaceId, LEGACY_WORKSPACE_ID))
    .get()
  if (!hasDestination && !hasPublication) return null

  db.insert(member)
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
