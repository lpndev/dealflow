import { Hono } from "hono";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { requireAuth, requireRole, type AppEnv } from "@/shared/auth";

export const whatsapp = new Hono<AppEnv>();

whatsapp.use("*", requireAuth);

whatsapp.get("/session", async (c) => {
  const status = await whatsappGateway
    .getSession(c.get("workspaceId"))
    .catch(() => ({ connection: "gateway offline", qr: null }));
  return c.json(status);
});

const manage = requireRole("owner", "admin");

whatsapp.post("/connect", manage, async (c) => {
  const ws = c.get("workspaceId");
  await whatsappGateway.connect(ws);
  return c.json(await whatsappGateway.getSession(ws));
});

whatsapp.post("/end", manage, async (c) => {
  const ws = c.get("workspaceId");
  await whatsappGateway.end(ws);
  return c.json(await whatsappGateway.getSession(ws));
});

whatsapp.post("/logout", manage, async (c) => {
  const ws = c.get("workspaceId");
  await whatsappGateway.logout(ws);
  return c.json(await whatsappGateway.getSession(ws));
});
