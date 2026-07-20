import { and, eq } from "drizzle-orm"
import type { Db } from "@/shared/db"
import { member } from "@/shared/schema"

export const isOwner = (role: string | null | undefined): boolean =>
  (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .includes("owner")

export function ownedWorkspaceIds(db: Db, userId: string): string[] {
  return db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, userId))
    .all()
    .filter((m) => isOwner(m.role))
    .map((m) => m.orgId)
}

export function isWorkspaceMember(
  db: Db,
  userId: string,
  workspaceId: string
): boolean {
  return Boolean(
    db
      .select({ id: member.id })
      .from(member)
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, workspaceId))
      )
      .get()
  )
}
