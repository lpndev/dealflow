import { and, eq } from "drizzle-orm"
import type { Db } from "@/shared/db"
import { member } from "@/shared/schema"

export const isOwner = (role: string | null | undefined): boolean =>
  (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .includes("owner")

export async function ownedWorkspaceIds(
  db: Db,
  userId: string
): Promise<string[]> {
  const rows = await db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, userId))
    .all()
  return rows.filter((m) => isOwner(m.role)).map((m) => m.orgId)
}

export async function isWorkspaceMember(
  db: Db,
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const row = await db
    .select({ id: member.id })
    .from(member)
    .where(
      and(eq(member.userId, userId), eq(member.organizationId, workspaceId))
    )
    .get()
  return Boolean(row)
}
