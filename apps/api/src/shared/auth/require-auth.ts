import { createMiddleware } from "hono/factory"
import { getDb } from "@/shared/db"
import type { auth } from "./auth"
import { isWorkspaceMember } from "./workspace-access"

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null
    session: typeof auth.$Infer.Session.session | null
    workspaceId: string
  }
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get("session")
  const user = c.get("user")
  if (!user || !session) return c.json({ error: "unauthorized" }, 401)
  const workspaceId = session.activeOrganizationId
  if (!workspaceId) return c.json({ error: "no active workspace" }, 403)
  if (!(await isWorkspaceMember(getDb(), user.id, workspaceId))) {
    return c.json({ error: "workspace access revoked" }, 403)
  }
  c.set("workspaceId", workspaceId)
  await next()
})
