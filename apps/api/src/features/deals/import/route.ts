import { Hono } from "hono";
import { importDeal } from "./use-case";
import { ImportError } from "@/shared/errors";

export const deals = new Hono();

deals.post("/import", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { input?: unknown };
  const input = body?.input;
  if (typeof input !== "string" || input.trim() === "") {
    return c.json({ error: "input is required" }, 400);
  }

  try {
    const draft = await importDeal(input);
    return c.json({ draft });
  } catch (err) {
    if (err instanceof ImportError) {
      return c.json({ error: err.message }, 422);
    }
    return c.json({ error: "failed to reach the marketplace" }, 502);
  }
});
