import type { ExtractedDeal } from "@/shared/types";

let pending: ExtractedDeal | null = null;

export function storeCapture(draft: ExtractedDeal) {
  pending = draft;
}

export function takeCapture(): ExtractedDeal | null {
  const draft = pending;
  pending = null;
  return draft;
}
