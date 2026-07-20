import { Hono } from "hono"
import { requireApiKey, requireAuth, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import {
  adoptAffiliateTag,
  sanitizeDraft,
  storeCapture,
  takeCapture
} from "./use-case"

export const capture = new Hono<AppEnv>()

capture.post("/capture", requireApiKey, async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    draft?: unknown
    affiliateTag?: unknown
  } | null
  const draft = sanitizeDraft(body?.draft)
  if (!draft) {
    return c.json({ error: "draft with affiliateUrl is required" }, 400)
  }
  const workspaceId = c.get("workspaceId")
  storeCapture(workspaceId, draft)
  adoptAffiliateTag(getDb(), workspaceId, body?.affiliateTag)
  return c.json({ ok: true })
})

capture.get("/capture", requireAuth, (c) =>
  c.json({ draft: takeCapture(c.get("workspaceId")) })
)
