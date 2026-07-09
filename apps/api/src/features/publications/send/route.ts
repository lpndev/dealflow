import { Hono } from "hono";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { getDb } from "@/shared/db";
import { DeliveryError } from "@/shared/errors";
import { sendPublication } from "./use-case";

export const send = new Hono();

send.post("/:id/send", async (c) => {
  const publicationId = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as {
    destinationIds?: unknown;
  } | null;
  const destinationIds = body?.destinationIds;

  if (!Array.isArray(destinationIds) || destinationIds.length === 0) {
    return c.json({ error: "destinationIds is required" }, 400);
  }

  try {
    const results = await sendPublication(
      { publicationId, destinationIds: destinationIds as string[] },
      getDb(),
      whatsappGateway,
    );
    return c.json({ results });
  } catch (err) {
    if (err instanceof DeliveryError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json({ error: "send failed" }, 502);
  }
});
