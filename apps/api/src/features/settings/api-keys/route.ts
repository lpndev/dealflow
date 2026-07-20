import { Hono } from "hono"
import { requireAuth, requireRole, type AppEnv } from "@/shared/auth"
import {
  createWorkspaceApiKey,
  deleteWorkspaceApiKey,
  listWorkspaceApiKeys,
  revokeWorkspaceApiKeys
} from "./use-case"

export const apiKeys = new Hono<AppEnv>()

apiKeys.use("*", requireAuth, requireRole("owner", "admin"))

apiKeys.post("/", async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { name?: string }
  const created = await createWorkspaceApiKey(
    c.req.raw.headers,
    c.get("workspaceId"),
    body.name ?? "Extensão"
  )
  return c.json(created)
})

apiKeys.get("/", async (c) => {
  const mine = await listWorkspaceApiKeys(
    c.req.raw.headers,
    c.get("workspaceId")
  )
  return c.json(
    mine.map((k) => ({
      id: k.id,
      name: k.name,
      start: k.start,
      createdAt: k.createdAt
    }))
  )
})

apiKeys.delete("/", async (c) => {
  const count = await revokeWorkspaceApiKeys(
    c.req.raw.headers,
    c.get("workspaceId")
  )
  return c.json({ revoked: count })
})

apiKeys.delete("/:id", async (c) => {
  const deleted = await deleteWorkspaceApiKey(
    c.req.raw.headers,
    c.get("workspaceId"),
    c.req.param("id")
  )
  if (!deleted) return c.json({ error: "not found" }, 404)
  return c.json({ ok: true })
})
