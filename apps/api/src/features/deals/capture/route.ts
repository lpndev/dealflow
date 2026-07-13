import type { ExtractedDeal } from "@dealflow/shared";
import { Hono } from "hono";
import { requireApiKey, requireAuth, type AppEnv } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { adoptAffiliateTag, storeCapture, takeCapture } from "./use-case";

export const capture = new Hono<AppEnv>();

capture.post("/capture", requireApiKey, async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    draft?: ExtractedDeal;
    affiliateTag?: unknown;
  } | null;
  const draft = body?.draft;
  if (!draft || typeof draft !== "object" || !draft.affiliateUrl) {
    return c.json({ error: "draft with affiliateUrl is required" }, 400);
  }
  const workspaceId = c.get("workspaceId");
  storeCapture(workspaceId, draft);

  if (typeof body?.affiliateTag === "string") {
    adoptAffiliateTag(getDb(), workspaceId, body.affiliateTag);
  }
  return c.json({ ok: true });
});

capture.get("/capture", requireAuth, (c) =>
  c.json({ draft: takeCapture(c.get("workspaceId")) }),
);
