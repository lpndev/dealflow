import { eq } from "drizzle-orm"
import { revokeWorkspaceApiKeys } from "@/features/settings/api-keys/use-case"
import { whatsappGateway } from "@/integrations/whatsapp/gateway"
import { auth, ownedWorkspaceIds } from "@/shared/auth"
import { getDb, type Db } from "@/shared/db"
import {
  affiliateLink,
  dealSnapshot,
  delivery,
  destination,
  product,
  publication,
  settings
} from "@/shared/schema"

export const WORKSPACE_TABLES = [
  delivery,
  publication,
  dealSnapshot,
  affiliateLink,
  destination,
  product,
  settings
]

export async function deleteWorkspaceData(
  db: Db,
  workspaceId: string
): Promise<void> {
  for (const table of WORKSPACE_TABLES) {
    await db.delete(table).where(eq(table.workspaceId, workspaceId)).run()
  }
}

export async function deleteWorkspace(
  headers: Headers,
  workspaceId: string
): Promise<void> {
  await revokeWorkspaceApiKeys(headers, workspaceId)
  await deleteWorkspaceData(getDb(), workspaceId)
  await whatsappGateway.logout(workspaceId).catch(() => {})
  await auth.api.deleteOrganization({
    headers,
    body: { organizationId: workspaceId }
  })
}

export async function resetOwnedWorkspaces(
  headers: Headers,
  userId: string
): Promise<number> {
  const owned = await ownedWorkspaceIds(getDb(), userId)
  for (const workspaceId of owned) {
    await deleteWorkspace(headers, workspaceId)
  }
  return owned.length
}
