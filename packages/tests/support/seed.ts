import { schedulePublication } from "@/features/publications/schedule/use-case"
import { createPublication } from "@/features/publications/use-case"
import { updateSettings } from "@/features/settings/use-case"
import { type Db } from "@/shared/db"
import { destination } from "@/shared/schema"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"
import { testDb } from "./db"

export const deal = {
  title: "Air Fryer",
  imageUrl: "https://http2.mlstatic.com/a.jpg",
  currentPrice: "299,90",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours"
}

export const T0 = new Date("2026-07-08T12:00:00Z")

export async function seed(db: Db, names: string[]): Promise<string[]> {
  const ids: string[] = []
  for (const [i, name] of names.entries()) {
    const id = `dest-${i}`
    await db
      .insert(destination)
      .values({
        id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        provider: "whatsapp",
        externalId: `${i}@g.us`,
        name
      })
      .run()
    ids.push(id)
  }
  return ids
}

export async function setupPublication() {
  const db = await testDb()
  const pub = await createPublication(deal, db, DEFAULT_WORKSPACE_ID)
  return { db, pub }
}

export async function setupScheduled(names: string[]) {
  const { db, pub } = await setupPublication()
  const dests = await seed(db, names)
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 100
  })
  await schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: () => 0 }
  )
  return { db, pub, dests }
}
