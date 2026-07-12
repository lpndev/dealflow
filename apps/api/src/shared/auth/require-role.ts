import { createMiddleware } from "hono/factory";
import { auth } from "./auth";

export type OrgRole = "owner" | "admin";

export function isRoleAllowed(
  role: string | null,
  allowed: OrgRole[],
): boolean {
  return role !== null && (allowed as string[]).includes(role);
}

export function requireRole(...allowed: OrgRole[]) {
  return createMiddleware(async (c, next) => {
    const member = await auth.api
      .getActiveMember({ headers: c.req.raw.headers })
      .catch(() => null);
    if (!isRoleAllowed(member?.role ?? null, allowed)) {
      return c.json({ error: "forbidden" }, 403);
    }
    await next();
  });
}
