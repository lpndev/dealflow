import { Hono } from "hono";
import { getSettings } from "@/features/settings/use-case";
import { fetchMercadoLivre } from "@/integrations/mercado-livre/source";
import { getDb } from "@/shared/db";
import { ImportError } from "@/shared/errors";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";
import { importDeal } from "./use-case";

export const deals = new Hono();

deals.post("/import", async (c) => {
  const body = (await c.req.json().catch(() => null)) as { input?: unknown };
  const input = body?.input;
  if (typeof input !== "string" || input.trim() === "") {
    return c.json({ error: "input is required" }, 400);
  }

  try {
    // ponytail: not session-scoped yet — out of Task 3's route list; revisit
    // alongside onboarding (Task 6) when a real workspaceId is available here.
    const tag = getSettings(getDb(), DEFAULT_WORKSPACE_ID).mlAffiliateTag;
    const draft = await importDeal(input, fetchMercadoLivre, tag);
    return c.json({ draft });
  } catch (err) {
    if (err instanceof ImportError) {
      return c.json({ error: err.message }, 422);
    }
    return c.json({ error: "failed to reach the marketplace" }, 502);
  }
});
