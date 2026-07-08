import { Hono } from "hono";
import { getDb } from "@/shared/db";
import { getSettings, updateSettings } from "./use-case";
import { SettingsError } from "@/shared/errors";

export const settingsRoutes = new Hono();

settingsRoutes.get("/", (c) => c.json(getSettings(getDb())));

settingsRoutes.put("/", async (c) => {
  const body = (await c.req.json().catch(() => null)) as {
    delayMinSeconds?: number;
    delayMaxSeconds?: number;
  } | null;

  if (
    typeof body?.delayMinSeconds !== "number" ||
    typeof body.delayMaxSeconds !== "number"
  ) {
    return c.json(
      { error: "delayMinSeconds and delayMaxSeconds are required" },
      400,
    );
  }

  try {
    return c.json(
      updateSettings(getDb(), {
        delayMinSeconds: body.delayMinSeconds,
        delayMaxSeconds: body.delayMaxSeconds,
      }),
    );
  } catch (err) {
    if (err instanceof SettingsError)
      return c.json({ error: err.message }, 400);
    throw err;
  }
});
