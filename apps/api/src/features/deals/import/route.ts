import { Hono } from "hono"
import { getSettings } from "@/features/settings/use-case"
import { fetchMercadoLivre } from "@/integrations/mercado-livre/source"
import { requireAuth, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import { ImportError } from "@/shared/errors"
import { rateLimit } from "@/shared/rate-limit"
import { importDeal } from "./use-case"

export const deals = new Hono<AppEnv>()

deals.use("/import", requireAuth)

deals.post("/import", rateLimit(10, 60), async (c) => {
  const body = (await c.req.json().catch(() => null)) as { input?: unknown }
  const input = body?.input
  if (typeof input !== "string" || input.trim() === "") {
    return c.json({ error: "input is required" }, 400)
  }

  try {
    const { mlAffiliateTag: tag } = await getSettings(
      getDb(),
      c.get("workspaceId")
    )
    const draft = await importDeal(input, fetchMercadoLivre, tag)
    return c.json({ draft })
  } catch (err) {
    if (err instanceof ImportError) {
      return c.json({ error: err.message }, 422)
    }
    return c.json({ error: "failed to reach the marketplace" }, 502)
  }
})
