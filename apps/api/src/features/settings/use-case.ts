import type { Settings } from "@dealflow/shared";
import { eq } from "drizzle-orm";
import { DEFAULT_TEMPLATE } from "@/features/publications/render";
import type { Db } from "@/shared/db";
import { SettingsError } from "@/shared/errors";
import { settings } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

const DEFAULTS: Settings = {
  delayMinSeconds: 1200,
  delayMaxSeconds: 2400,
  queuePaused: false,
  messageTemplate: DEFAULT_TEMPLATE,
};

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
    queuePaused: row.queuePaused,
    messageTemplate: row.messageTemplate ?? DEFAULT_TEMPLATE,
  };
}

export function updateSettings(db: Db, input: Partial<Settings>): Settings {
  const next: Settings = { ...getSettings(db), ...input };

  if (
    !Number.isInteger(next.delayMinSeconds) ||
    !Number.isInteger(next.delayMaxSeconds) ||
    next.delayMinSeconds < 0
  ) {
    throw new SettingsError("delays must be non-negative whole seconds");
  }
  if (next.delayMaxSeconds < next.delayMinSeconds) {
    throw new SettingsError("max delay must be greater than or equal to min");
  }
  if (!next.messageTemplate.includes("{link}")) {
    throw new SettingsError("template must include the {link} placeholder");
  }

  db.insert(settings)
    .values({
      workspaceId: DEFAULT_WORKSPACE_ID,
      ...next,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.workspaceId,
      set: { ...next, updatedAt: new Date() },
    })
    .run();

  return getSettings(db);
}
