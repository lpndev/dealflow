import { Hono } from "hono"
import { whatsappGateway } from "@/integrations/whatsapp/gateway"
import { requireAuth, requireRole, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import { PlanLimitError } from "@/shared/errors"
import {
  listDestinations,
  publicDestinations,
  setDestinationEnabled,
  syncDestinations
} from "./use-case"

export const destinations = new Hono<AppEnv>()

destinations.use("*", requireAuth)

destinations.get("/", (c) =>
  c.json({
    destinations: publicDestinations(
      listDestinations(getDb(), c.get("workspaceId"))
    )
  })
)

destinations.patch("/:id", requireRole("owner", "admin"), async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    enabled?: unknown
  } | null
  if (typeof body?.enabled !== "boolean") {
    return c.json({ error: "enabled must be a boolean" }, 400)
  }
  try {
    return c.json({
      destinations: publicDestinations(
        setDestinationEnabled(
          getDb(),
          c.get("workspaceId"),
          c.req.param("id"),
          body.enabled
        )
      )
    })
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return c.json({ error: err.message }, 402)
    }
    throw err
  }
})

destinations.post("/sync", requireRole("owner", "admin"), async (c) => {
  try {
    const synced = await syncDestinations(
      getDb(),
      c.get("workspaceId"),
      whatsappGateway
    )
    return c.json({ destinations: publicDestinations(synced) })
  } catch {
    return c.json({ error: "wa-gateway unavailable" }, 502)
  }
})
