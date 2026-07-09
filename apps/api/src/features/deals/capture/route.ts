import type { ExtractedDeal } from "@dealflow/shared";
import { Hono } from "hono";
import { storeCapture, takeCapture } from "./use-case";

export const capture = new Hono();

capture.post("/capture", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    draft?: ExtractedDeal;
  } | null;
  const draft = body?.draft;
  if (!draft || typeof draft !== "object" || !draft.affiliateUrl) {
    return c.json({ error: "draft with affiliateUrl is required" }, 400);
  }
  storeCapture(draft);
  return c.json({ ok: true });
});

capture.get("/capture", (c) => c.json({ draft: takeCapture() }));
