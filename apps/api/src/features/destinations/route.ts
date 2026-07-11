import { Hono } from "hono";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { requireAuth, type AppEnv } from "@/shared/auth";
import { getDb } from "@/shared/db";
import {
  listDestinations,
  setDestinationEnabled,
  syncDestinations,
} from "./use-case";

export const destinations = new Hono<AppEnv>();

destinations.use("*", requireAuth);

destinations.get("/", (c) =>
  c.json({ destinations: listDestinations(getDb(), c.get("workspaceId")) }),
);

destinations.patch("/:id", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    enabled?: unknown;
  } | null;
  if (typeof body?.enabled !== "boolean") {
    return c.json({ error: "enabled must be a boolean" }, 400);
  }
  return c.json({
    destinations: setDestinationEnabled(
      getDb(),
      c.get("workspaceId"),
      c.req.param("id"),
      body.enabled,
    ),
  });
});

destinations.post("/sync", async (c) => {
  try {
    const synced = await syncDestinations(
      getDb(),
      c.get("workspaceId"),
      whatsappGateway,
    );
    return c.json({ destinations: synced });
  } catch {
    return c.json({ error: "wa-gateway unavailable" }, 502);
  }
});
