import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import {
  endConnection,
  getQrDataUrl,
  getSession,
  listGroups,
  logout,
  reconnect,
  sendMessage,
} from "@/whatsapp";

const SESSION_ID = /^[A-Za-z0-9_-]+$/;

const requireValidId = createMiddleware(async (c, next) => {
  if (!SESSION_ID.test(c.req.param("id") ?? "")) {
    return c.json({ error: "invalid session id" }, 400);
  }
  await next();
});

export const app = new Hono();

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/sessions/:id", requireValidId);
app.use("/sessions/:id/*", requireValidId);

app.get("/sessions/:id", (c) => c.json(getSession(c.req.param("id"))));

app.post("/sessions/:id/connect", async (c) => {
  await reconnect(c.req.param("id"));
  return c.json(getSession(c.req.param("id")));
});

app.post("/sessions/:id/end", (c) => {
  endConnection(c.req.param("id"));
  return c.json(getSession(c.req.param("id")));
});

app.post("/sessions/:id/logout", async (c) => {
  await logout(c.req.param("id"));
  return c.json(getSession(c.req.param("id")));
});

app.get("/sessions/:id/qr", async (c) => {
  const qr = await getQrDataUrl(c.req.param("id"));
  if (!qr) return c.json({ error: "no qr available" }, 404);
  return c.json({ qr });
});

app.get("/sessions/:id/groups", async (c) => {
  try {
    return c.json({ groups: await listGroups(c.req.param("id")) });
  } catch {
    return c.json({ error: "not connected" }, 409);
  }
});

app.post("/sessions/:id/messages", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    to?: string;
    content?: string;
    imageUrl?: string;
  } | null;

  if (!body?.to || !body.content) {
    return c.json({ error: "to and content are required" }, 400);
  }
  if (body.imageUrl && !isHttpUrl(body.imageUrl)) {
    return c.json({ error: "imageUrl must be an http(s) url" }, 400);
  }

  try {
    return c.json(
      await sendMessage(
        c.req.param("id"),
        body.to,
        body.content,
        body.imageUrl,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "send failed";
    return c.json({ error: message }, 502);
  }
});

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

export default app;
