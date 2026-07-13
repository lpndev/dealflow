import { and, eq } from "drizzle-orm";
import type { Db } from "@/shared/db";
import type { MessagingProvider } from "@/shared/messaging";
import { destination } from "@/shared/schema";

export function listDestinations(db: Db, workspaceId: string) {
  return db
    .select()
    .from(destination)
    .where(eq(destination.workspaceId, workspaceId))
    .all();
}

export function setDestinationEnabled(
  db: Db,
  workspaceId: string,
  id: string,
  enabled: boolean,
) {
  db.update(destination)
    .set({ enabled })
    .where(
      and(eq(destination.id, id), eq(destination.workspaceId, workspaceId)),
    )
    .run();
  return listDestinations(db, workspaceId);
}

export async function syncDestinations(
  db: Db,
  workspaceId: string,
  provider: MessagingProvider,
) {
  const groups = await provider.listGroups(workspaceId);

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
        .where(
          and(
            eq(destination.id, existing.id),
            eq(destination.workspaceId, workspaceId),
          ),
        )
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

  return listDestinations(db, workspaceId);
}
