import type { Settings } from "@dealflow/shared"
import { eq } from "drizzle-orm"
import { DEFAULT_TEMPLATE } from "@/features/publications/render"
import type { Db } from "@/shared/db"
import { SettingsError } from "@/shared/errors"
import { settings } from "@/shared/schema"

const DEFAULTS: Settings = {
  delayMinSeconds: 1200,
  delayMaxSeconds: 2400,
  queuePaused: false,
  messageTemplate: DEFAULT_TEMPLATE,
  mlAffiliateTag: null
}

export async function getSettings(
  db: Db,
  workspaceId: string
): Promise<Settings> {
  const row = await db
    .select()
    .from(settings)
    .where(eq(settings.workspaceId, workspaceId))
    .get()
  if (!row) return { ...DEFAULTS }
  return {
    delayMinSeconds: row.delayMinSeconds,
    delayMaxSeconds: row.delayMaxSeconds,
    queuePaused: row.queuePaused,
    messageTemplate: row.messageTemplate ?? DEFAULT_TEMPLATE,
    mlAffiliateTag: row.mlAffiliateTag ?? null
  }
}

export async function updateSettings(
  db: Db,
  workspaceId: string,
  input: Partial<Settings>
): Promise<Settings> {
  const next: Settings = { ...(await getSettings(db, workspaceId)), ...input }
  next.mlAffiliateTag = next.mlAffiliateTag?.trim() || null

  if (next.mlAffiliateTag && next.mlAffiliateTag.length > 60) {
    throw new SettingsError("affiliate tag must be at most 60 characters")
  }
  if (
    !Number.isInteger(next.delayMinSeconds) ||
    !Number.isInteger(next.delayMaxSeconds) ||
    next.delayMinSeconds < 0
  ) {
    throw new SettingsError("delays must be non-negative whole seconds")
  }
  if (next.delayMaxSeconds < next.delayMinSeconds) {
    throw new SettingsError("max delay must be greater than or equal to min")
  }
  if (!next.messageTemplate.includes("{link}")) {
    throw new SettingsError("template must include the {link} placeholder")
  }

  await db
    .insert(settings)
    .values({
      workspaceId,
      ...next,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: settings.workspaceId,
      set: { ...next, updatedAt: new Date() }
    })
    .run()

  return getSettings(db, workspaceId)
}
