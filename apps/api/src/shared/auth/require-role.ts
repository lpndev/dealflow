import { createMiddleware } from "hono/factory"
import { auth } from "./auth"

export type OrgRole = "owner" | "admin"

export function isRoleAllowed(
  role: string | null,
  allowed: OrgRole[]
): boolean {
  return role !== null && (allowed as string[]).includes(role)
}

export function activeRole(headers: Headers): Promise<string | null> {
  return auth.api
    .getActiveMember({ headers })
    .then((member) => member?.role ?? null)
    .catch(() => null)
}

export function requireRole(...allowed: OrgRole[]) {
  return createMiddleware(async (c, next) => {
    if (!isRoleAllowed(await activeRole(c.req.raw.headers), allowed)) {
      return c.json({ error: "forbidden" }, 403)
    }
    await next()
  })
}
