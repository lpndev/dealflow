import type { ExtractedDeal } from "@dealflow/shared";
import { Hono } from "hono";
import { requireApiKey, requireAuth, type AppEnv } from "@/shared/auth";
import { storeCapture, takeCapture } from "./use-case";

export const capture = new Hono<AppEnv>();

capture.post("/capture", requireApiKey, async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    draft?: ExtractedDeal;
  } | null;
  const draft = body?.draft;
  if (!draft || typeof draft !== "object" || !draft.affiliateUrl) {
    return c.json({ error: "draft with affiliateUrl is required" }, 400);
  }
  storeCapture(c.get("workspaceId"), draft);
  return c.json({ ok: true });
});

capture.get("/capture", requireAuth, (c) =>
  c.json({ draft: takeCapture(c.get("workspaceId")) }),
);
