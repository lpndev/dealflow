import type { ExtractedDeal } from "@dealflow/shared";
import { getSettings, updateSettings } from "@/features/settings/use-case";
import type { Db } from "@/shared/db";

// ponytail: transient in-memory handoff, one machine, one slot per workspace.
// Becomes a table only if it must survive a restart.
const pending = new Map<string, ExtractedDeal>();

export function storeCapture(workspaceId: string, draft: ExtractedDeal) {
  pending.set(workspaceId, draft);
}

export function takeCapture(workspaceId: string): ExtractedDeal | null {
  const draft = pending.get(workspaceId) ?? null;
  pending.delete(workspaceId);
  return draft;
}

export function adoptAffiliateTag(
  db: Db,
  workspaceId: string,
  tag: string,
): void {
  if (!tag.trim()) return;
  if (getSettings(db, workspaceId).mlAffiliateTag) return;
  updateSettings(db, workspaceId, { mlAffiliateTag: tag });
}
