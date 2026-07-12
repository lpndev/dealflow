import { Hono } from "hono";
import { requireAuth, requireRole, type AppEnv } from "@/shared/auth";
import { deleteWorkspace, resetOwnedWorkspaces } from "./use-case";

export const workspaceDanger = new Hono<AppEnv>();

workspaceDanger.use("*", requireAuth);

workspaceDanger.delete("/", requireRole("owner"), async (c) => {
  await deleteWorkspace(c.req.raw.headers, c.get("workspaceId"));
  return c.json({ ok: true });
});

workspaceDanger.post("/reset", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const count = await resetOwnedWorkspaces(c.req.raw.headers, user.id);
  return c.json({ ok: true, workspaces: count });
});
