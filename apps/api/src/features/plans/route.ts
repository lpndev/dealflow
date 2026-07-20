import { Hono } from "hono"
import { requireAuth, type AppEnv } from "@/shared/auth"
import { getDb } from "@/shared/db"
import { planStatusForWorkspace } from "@/shared/plans"

export const plans = new Hono<AppEnv>()

plans.use("*", requireAuth)

plans.get("/", async (c) =>
  c.json(await planStatusForWorkspace(getDb(), c.get("workspaceId")))
)
