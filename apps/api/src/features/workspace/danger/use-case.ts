import { eq } from "drizzle-orm";
import { revokeWorkspaceApiKeys } from "@/features/settings/api-keys/use-case";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { auth, isOwner } from "@/shared/auth";
import { getDb, type Db } from "@/shared/db";
import {
  affiliateLink,
  dealSnapshot,
  delivery,
  destination,
  member,
  product,
  publication,
  settings,
} from "@/shared/schema";

export const WORKSPACE_TABLES = [
  delivery,
  publication,
  dealSnapshot,
  affiliateLink,
  destination,
  product,
  settings,
];

export function deleteWorkspaceData(db: Db, workspaceId: string): void {
  for (const table of WORKSPACE_TABLES) {
    db.delete(table).where(eq(table.workspaceId, workspaceId)).run();
  }
}

export async function deleteWorkspace(
  headers: Headers,
  workspaceId: string,
): Promise<void> {
  await revokeWorkspaceApiKeys(headers, workspaceId);
  deleteWorkspaceData(getDb(), workspaceId);
  await whatsappGateway.logout(workspaceId).catch(() => {});
  await auth.api.deleteOrganization({
    headers,
    body: { organizationId: workspaceId },
  });
}

function ownedWorkspaceIds(db: Db, userId: string): string[] {
  return db
    .select({ orgId: member.organizationId, role: member.role })
    .from(member)
    .where(eq(member.userId, userId))
    .all()
    .filter((m) => isOwner(m.role))
    .map((m) => m.orgId);
}

export async function resetOwnedWorkspaces(
  headers: Headers,
  userId: string,
): Promise<number> {
  const owned = ownedWorkspaceIds(getDb(), userId);
  for (const workspaceId of owned) {
    await deleteWorkspace(headers, workspaceId);
  }
  return owned.length;
}
