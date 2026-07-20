import { testDb } from "@support/db"
import { expect, it } from "vitest"
import { schedulePublication } from "@/features/publications/schedule/use-case"
import { createPublication } from "@/features/publications/use-case"
import { updateSettings } from "@/features/settings/use-case"
import { type Db } from "@/shared/db"
import { ScheduleError } from "@/shared/errors"
import { delivery, destination, publication } from "@/shared/schema"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

const deal = {
  title: "Air Fryer",
  imageUrl: "https://http2.mlstatic.com/a.jpg",
  currentPrice: "299,90",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours"
}

async function seed(db: Db, names: string[]): Promise<string[]> {
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

async function setup() {
  const db = await testDb()
  const pub = await createPublication(deal, db, DEFAULT_WORKSPACE_ID)
  return { db, pub }
}

const T0 = new Date("2026-07-08T12:00:00Z")
const noJitter = () => 0

it("sends the first offer now and spaces the rest by the interval", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["G1", "G2", "G3"])
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 200
  })

  const scheduled = await schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: noJitter }
  )

  expect(scheduled.map((s) => s.dueAt.getTime())).toEqual([
    T0.getTime(),
    T0.getTime() + 100_000,
    T0.getTime() + 200_000
  ])
  const rows = await db.select().from(delivery).all()
  expect(rows.every((r) => r.status === "scheduled")).toBe(true)
})

it("keeps the spacing between sends inside the configured range", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["G1", "G2"])
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 200
  })

  const scheduled = await schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: () => 0.5 }
  )

  const gap =
    (scheduled[1].dueAt.getTime() - scheduled[0].dueAt.getTime()) / 1000
  expect(gap).toBeGreaterThanOrEqual(100)
  expect(gap).toBeLessThanOrEqual(200)
})

it("starts the queue at an explicit start time", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["G1", "G2"])
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 100
  })
  const startAt = new Date(T0.getTime() + 3_600_000)

  const scheduled = await schedulePublication(
    { publicationId: pub.id, destinationIds: dests, startAt },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: noJitter }
  )

  expect(scheduled[0].dueAt.getTime()).toBe(startAt.getTime())
  expect(scheduled[1].dueAt.getTime()).toBe(startAt.getTime() + 100_000)
})

it("clamps a start time in the past to now", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["G1"])
  const startAt = new Date(T0.getTime() - 3_600_000)

  const scheduled = await schedulePublication(
    { publicationId: pub.id, destinationIds: dests, startAt },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: noJitter }
  )

  expect(scheduled[0].dueAt.getTime()).toBe(T0.getTime())
})

it("queues new sends after existing pending ones (global serial)", async () => {
  const { db, pub } = await setup()
  const [d0, d1] = await seed(db, ["G1", "G2"])
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 100
  })

  await db
    .insert(delivery)
    .values({
      id: "pending-1",
      workspaceId: DEFAULT_WORKSPACE_ID,
      publicationId: pub.id,
      destinationId: d1,
      status: "scheduled",
      dueAt: new Date(T0.getTime() + 1_000_000)
    })
    .run()

  const scheduled = await schedulePublication(
    { publicationId: pub.id, destinationIds: [d0] },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: noJitter }
  )

  expect(scheduled[0].dueAt.getTime()).toBe(T0.getTime() + 1_000_000 + 100_000)
})

it("does not double-schedule the same publication and destination", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["G1"])

  await schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0 }
  )
  const second = await schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0 }
  )

  expect(second).toHaveLength(0)
  expect(await db.select().from(delivery).all()).toHaveLength(1)
})

it("marks the publication as sending once scheduled", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["G1"])

  await schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0 }
  )

  const row = (await db.select().from(publication).all())[0]
  expect(row.status).toBe("sending")
})

it("rejects scheduling an unknown publication", async () => {
  const { db } = await setup()
  await expect(
    schedulePublication(
      { publicationId: "missing", destinationIds: [] },
      db,
      DEFAULT_WORKSPACE_ID
    )
  ).rejects.toThrow(ScheduleError)
})

it("validates every destination before creating queue entries", async () => {
  const { db, pub } = await setup()
  const [valid] = await seed(db, ["G1"])

  await expect(
    schedulePublication(
      { publicationId: pub.id, destinationIds: [valid, "missing"] },
      db,
      DEFAULT_WORKSPACE_ID
    )
  ).rejects.toThrow(ScheduleError)
  expect(await db.select().from(delivery).all()).toHaveLength(0)
})

it("deduplicates destinations before scheduling", async () => {
  const { db, pub } = await setup()
  const [valid] = await seed(db, ["G1"])

  const result = await schedulePublication(
    { publicationId: pub.id, destinationIds: [valid, valid] },
    db,
    DEFAULT_WORKSPACE_ID
  )

  expect(result).toHaveLength(1)
})
