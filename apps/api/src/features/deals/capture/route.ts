import type { ExtractedDeal } from "@dealflow/shared";
import { Hono } from "hono";
import { auth, requireAuth, type AppEnv } from "@/shared/auth";
import { storeCapture, takeCapture } from "./use-case";

export const capture = new Hono<AppEnv>();

capture.post("/capture", async (c) => {
  const key = c.req.header("x-api-key");
  if (!key) return c.json({ error: "unauthorized" }, 401);

  const verified = await auth.api
    .verifyApiKey({ body: { key } })
    .catch(() => null);
  const metadata = verified?.valid ? (verified.key?.metadata ?? null) : null;
  const parsed = ((): { organizationId?: string } | null => {
    try {
      return typeof metadata === "string" ? JSON.parse(metadata) : metadata;
    } catch {
      return null;
    }
  })();
  const workspaceId = parsed?.organizationId;
  if (!workspaceId) return c.json({ error: "unauthorized" }, 401);

  const body = (await c.req.json().catch(() => null)) as {
    draft?: ExtractedDeal;
  } | null;
  const draft = body?.draft;
  if (!draft || typeof draft !== "object" || !draft.affiliateUrl) {
    return c.json({ error: "draft with affiliateUrl is required" }, 400);
  }
  storeCapture(workspaceId, draft);
  return c.json({ ok: true });
});

capture.get("/capture", requireAuth, (c) =>
  c.json({ draft: takeCapture(c.get("workspaceId")) }),
);
