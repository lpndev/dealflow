import type { ExtractedDeal } from "@dealflow/shared";

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
