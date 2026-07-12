import { eq } from "drizzle-orm";
import { revokeWorkspaceApiKeys } from "@/features/settings/api-keys/use-case";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { auth } from "@/shared/auth";
import { getDb } from "@/shared/db";
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

type Db = ReturnType<typeof getDb>;

export function deleteWorkspaceData(db: Db, workspaceId: string): void {
  db.delete(delivery).where(eq(delivery.workspaceId, workspaceId)).run();
  db.delete(publication).where(eq(publication.workspaceId, workspaceId)).run();
  db.delete(dealSnapshot)
    .where(eq(dealSnapshot.workspaceId, workspaceId))
    .run();
  db.delete(affiliateLink)
    .where(eq(affiliateLink.workspaceId, workspaceId))
    .run();
  db.delete(destination).where(eq(destination.workspaceId, workspaceId)).run();
  db.delete(product).where(eq(product.workspaceId, workspaceId)).run();
  db.delete(settings).where(eq(settings.workspaceId, workspaceId)).run();
}

export async function deleteWorkspace(
  headers: Headers,
  workspaceId: string,
): Promise<void> {
  await revokeWorkspaceApiKeys(headers, workspaceId);
  deleteWorkspaceData(getDb(), workspaceId);
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
    .filter((m) => m.role.split(",").some((r) => r.trim() === "owner"))
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
  await whatsappGateway.logout().catch(() => {});
  return owned.length;
}
