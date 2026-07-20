import { Hono } from "hono"
import { requireAuth, requireRole, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import { SettingsError } from "@/shared/errors"
import { getSettings, updateSettings } from "./use-case"

export const settingsRoutes = new Hono<AppEnv>()

settingsRoutes.use("*", requireAuth)

settingsRoutes.get("/", (c) =>
  c.json(getSettings(getDb(), c.get("workspaceId")))
)

settingsRoutes.put("/", requireRole("owner", "admin"), async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    delayMinSeconds?: number
    delayMaxSeconds?: number
    messageTemplate?: string
    mlAffiliateTag?: string | null
  } | null

  if (
    typeof body?.delayMinSeconds !== "number" ||
    typeof body.delayMaxSeconds !== "number" ||
    typeof body.messageTemplate !== "string"
  ) {
    return c.json(
      {
        error:
          "delayMinSeconds, delayMaxSeconds and messageTemplate are required"
      },
      400
    )
  }

  try {
    return c.json(
      updateSettings(getDb(), c.get("workspaceId"), {
        delayMinSeconds: body.delayMinSeconds,
        delayMaxSeconds: body.delayMaxSeconds,
        messageTemplate: body.messageTemplate,
        ...(body.mlAffiliateTag !== undefined && {
          mlAffiliateTag: body.mlAffiliateTag
        })
      })
    )
  } catch (err) {
    if (err instanceof SettingsError) return c.json({ error: err.message }, 400)
    throw err
  }
})
