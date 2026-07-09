import { Hono } from "hono";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { getDb } from "@/shared/db";
import { listDestinations, syncDestinations } from "./use-case";

export const destinations = new Hono();

destinations.get("/", (c) =>
  c.json({ destinations: listDestinations(getDb()) }),
);

destinations.post("/sync", async (c) => {
  try {
    const synced = await syncDestinations(getDb(), whatsappGateway);
    return c.json({ destinations: synced });
  } catch {
    return c.json({ error: "wa-gateway unavailable" }, 502);
  }
});
