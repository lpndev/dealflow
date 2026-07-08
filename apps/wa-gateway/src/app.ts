import { Hono } from "hono";
import { cors } from "hono/cors";
import { getSession, getQrDataUrl, listGroups, sendMessage } from "@/whatsapp";

export const app = new Hono();

app.use("/*", cors({ origin: "http://localhost:5173" }));

app.get("/health", (c) => c.json({ status: "ok" }));

app.get("/session", (c) => c.json(getSession()));

app.get("/session/qr", async (c) => {
  const qr = await getQrDataUrl();
  if (!qr) return c.json({ error: "no qr available" }, 404);
  return c.json({ qr });
});

app.get("/groups", async (c) => {
  try {
    return c.json({ groups: await listGroups() });
  } catch {
    return c.json({ error: "not connected" }, 409);
  }
});

app.post("/messages", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    to?: string;
    content?: string;
    imageUrl?: string;
  } | null;

  if (!body?.to || !body.content) {
    return c.json({ error: "to and content are required" }, 400);
  }

  try {
    return c.json(await sendMessage(body.to, body.content, body.imageUrl));
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    return c.json({ error: message }, 502);
  }
});

export default app;
