import { createMiddleware } from "hono/factory";
import type { auth } from "./auth";

export type AppEnv = {
  Variables: {
    user: typeof auth.$Infer.Session.user | null;
    session: typeof auth.$Infer.Session.session | null;
    workspaceId: string;
  };
};

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const session = c.get("session");
  const user = c.get("user");
  if (!user || !session) return c.json({ error: "unauthorized" }, 401);
  const workspaceId = session.activeOrganizationId;
  if (!workspaceId) return c.json({ error: "no active workspace" }, 403);
  c.set("workspaceId", workspaceId);
  await next();
});
