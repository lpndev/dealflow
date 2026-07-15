import { and, eq } from "drizzle-orm";
import type { Db } from "@/shared/db";
import { member } from "@/shared/schema";

export function isWorkspaceMember(
  db: Db,
  userId: string,
  workspaceId: string,
): boolean {
  return Boolean(
    db
      .select({ id: member.id })
      .from(member)
      .where(
        and(eq(member.userId, userId), eq(member.organizationId, workspaceId)),
      )
      .get(),
  );
}
