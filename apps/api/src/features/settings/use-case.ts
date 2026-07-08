import { eq } from "drizzle-orm";
import type { Db } from "@/shared/db";
import { settings } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";
import { SettingsError } from "@/shared/errors";

export type Settings = {
  delayMinSeconds: number;
  delayMaxSeconds: number;
};

const DEFAULTS: Settings = { delayMinSeconds: 1200, delayMaxSeconds: 2400 };

export function getSettings(db: Db): Settings {
  const row = db
    .select()
    .from(settings)
    .where(eq(settings.workspaceId, DEFAULT_WORKSPACE_ID))
    .get();
  if (!row) return { ...DEFAULTS };
  return {
    delayMinSeconds: row.delayMinSeconds,
    delayMaxSeconds: row.delayMaxSeconds,
  };
}

export function updateSettings(db: Db, input: Settings): Settings {
  if (
    !Number.isInteger(input.delayMinSeconds) ||
    !Number.isInteger(input.delayMaxSeconds) ||
    input.delayMinSeconds < 0
  ) {
    throw new SettingsError("delays must be non-negative whole seconds");
  }
  if (input.delayMaxSeconds < input.delayMinSeconds) {
    throw new SettingsError("max delay must be greater than or equal to min");
  }

  db.insert(settings)
    .values({
      workspaceId: DEFAULT_WORKSPACE_ID,
      ...input,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.workspaceId,
      set: { ...input, updatedAt: new Date() },
    })
    .run();

  return getSettings(db);
}
