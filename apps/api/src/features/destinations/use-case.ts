import { and, eq } from "drizzle-orm";
import type { Db } from "@/shared/db";
import type { MessagingProvider } from "@/shared/messaging";
import { destination } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

export function listDestinations(db: Db) {
  return db
    .select()
    .from(destination)
    .where(eq(destination.workspaceId, DEFAULT_WORKSPACE_ID))
    .all();
}

export async function syncDestinations(db: Db, provider: MessagingProvider) {
  const groups = await provider.listGroups();
  const workspaceId = DEFAULT_WORKSPACE_ID;

  for (const group of groups) {
    const existing = db
      .select({ id: destination.id })
      .from(destination)
      .where(
        and(
          eq(destination.workspaceId, workspaceId),
          eq(destination.provider, group.provider),
          eq(destination.externalId, group.externalId),
        ),
      )
      .get();

    if (existing) {
      db.update(destination)
        .set({ name: group.name })
        .where(eq(destination.id, existing.id))
        .run();
    } else {
      db.insert(destination)
        .values({
          id: crypto.randomUUID(),
          workspaceId,
          provider: group.provider,
          externalId: group.externalId,
          name: group.name,
        })
        .run();
    }
  }

  return listDestinations(db);
}
