import { Hono } from "hono";
import { whatsappGateway } from "@/integrations/whatsapp/gateway";
import { requireAuth, type AppEnv } from "@/shared/auth";
import { getDb } from "@/shared/db";
import { DeliveryError, PlanLimitError } from "@/shared/errors";
import { rateLimit } from "@/shared/rate-limit";
import { nonEmptyStringArray } from "@/shared/validate";
import { sendPublication } from "./use-case";

export const send = new Hono<AppEnv>();

send.use("*", requireAuth);

send.post("/:id/send", rateLimit(20, 60), async (c) => {
  const publicationId = c.req.param("id");
  const body = (await c.req.json().catch(() => null)) as {
    destinationIds?: unknown;
  } | null;
  const destinationIds = nonEmptyStringArray(body?.destinationIds);

  if (!destinationIds) {
    return c.json({ error: "destinationIds is required" }, 400);
  }

  try {
    const results = await sendPublication(
      { publicationId, destinationIds },
      getDb(),
      c.get("workspaceId"),
      whatsappGateway,
    );
    return c.json({ results });
  } catch (err) {
    if (err instanceof PlanLimitError) {
      return c.json({ error: err.message }, 402);
    }
    if (err instanceof DeliveryError) {
      return c.json({ error: err.message }, 404);
    }
    return c.json({ error: "send failed" }, 502);
  }
});
