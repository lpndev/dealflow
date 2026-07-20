import { Hono } from "hono"
import { whatsappGateway } from "@/integrations/whatsapp/gateway"
import {
  activeRole,
  isRoleAllowed,
  requireAuth,
  requireRole,
  type AppEnv,
  type OrgRole
} from "@/shared/auth"

const MANAGE_ROLES: OrgRole[] = ["owner", "admin"]

export const whatsapp = new Hono<AppEnv>()

whatsapp.use("*", requireAuth)

whatsapp.get("/session", async (c) => {
  const status = await whatsappGateway
    .getSession(c.get("workspaceId"))
    .catch(() => ({ connection: "gateway offline", qr: null }))
  if (!status.qr) return c.json(status)
  const canManage = isRoleAllowed(
    await activeRole(c.req.raw.headers),
    MANAGE_ROLES
  )
  return c.json(canManage ? status : { ...status, qr: null })
})

const manage = requireRole(...MANAGE_ROLES)

whatsapp.post("/connect", manage, async (c) => {
  const ws = c.get("workspaceId")
  await whatsappGateway.connect(ws)
  return c.json(await whatsappGateway.getSession(ws))
})

whatsapp.post("/end", manage, async (c) => {
  const ws = c.get("workspaceId")
  await whatsappGateway.end(ws)
  return c.json(await whatsappGateway.getSession(ws))
})

whatsapp.post("/logout", manage, async (c) => {
  const ws = c.get("workspaceId")
  await whatsappGateway.logout(ws)
  return c.json(await whatsappGateway.getSession(ws))
})
