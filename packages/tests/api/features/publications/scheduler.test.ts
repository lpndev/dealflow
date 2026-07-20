import { testDb } from "@support/db"
import { FakeMessaging } from "@support/fake-messaging"
import { deal, seed, setupScheduled as setup, T0 } from "@support/seed"
import { expect, it } from "vitest"
import { dispatchDue } from "@/features/publications/schedule/scheduler"
import { schedulePublication } from "@/features/publications/schedule/use-case"
import { createPublication } from "@/features/publications/use-case"
import { setQueuePaused } from "@/features/queue/use-case"
import { updateSettings } from "@/features/settings/use-case"
import { delivery, destination, publication } from "@/shared/schema"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

const past = new Date(T0.getTime() + 300_000)

it("dispatches one due send at a time, earliest first", async () => {
  const { db, dests } = await setup(["G1", "G2"])
  const provider = new FakeMessaging()

  const r1 = await dispatchDue(db, provider, past)
  expect(r1?.destinationId).toBe(dests[0])
  expect(provider.sent).toHaveLength(1)

  const r2 = await dispatchDue(db, provider, past)
  expect(r2?.destinationId).toBe(dests[1])

  const r3 = await dispatchDue(db, provider, past)
  expect(r3).toBeNull()
  expect(provider.sent).toHaveLength(2)
})

it("does not dispatch a send before it is due", async () => {
  const db = await testDb()
  const pub = await createPublication(deal, db, DEFAULT_WORKSPACE_ID)
  const dests = await seed(db, ["G1"])
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 100
  })
  await schedulePublication(
    {
      publicationId: pub.id,
      destinationIds: dests,
      startAt: new Date(T0.getTime() + 100_000)
    },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: () => 0 }
  )
  const provider = new FakeMessaging()

  const r = await dispatchDue(db, provider, new Date(T0.getTime() + 50_000))
  expect(r).toBeNull()
  expect(provider.sent).toHaveLength(0)
})

it("dispatches nothing while the queue is paused", async () => {
  const { db } = await setup(["G1"])
  const provider = new FakeMessaging()
  await setQueuePaused(db, DEFAULT_WORKSPACE_ID, true)

  const paused = await dispatchDue(db, provider, past)
  expect(paused).toBeNull()
  expect(provider.sent).toHaveLength(0)

  await setQueuePaused(db, DEFAULT_WORKSPACE_ID, false)
  const resumed = await dispatchDue(db, provider, past)
  expect(resumed).not.toBeNull()
  expect(provider.sent).toHaveLength(1)
})

it("marks the publication sent once every due send goes out", async () => {
  const { db, pub } = await setup(["G1", "G2"])
  const provider = new FakeMessaging()

  await dispatchDue(db, provider, past)
  await dispatchDue(db, provider, past)

  const row = (await db.select().from(publication).all()).find(
    (p) => p.id === pub.id
  )
  expect(row?.status).toBe("sent")
})

it("marks a failed send failed and does not auto-retry it", async () => {
  const { db } = await setup(["G1"])
  const provider = new FakeMessaging()
  provider.failNext = true

  const failed = await dispatchDue(db, provider, past)
  expect(failed?.status).toBe("failed")

  const retry = await dispatchDue(db, provider, past)
  expect(retry).toBeNull()
})

it("does not let a paused workspace's older due item starve other workspaces", async () => {
  const db = await testDb()
  const provider = new FakeMessaging()

  const pausedPub = await createPublication(deal, db, "ws-paused")
  await db
    .insert(destination)
    .values({
      id: "dest-paused",
      workspaceId: "ws-paused",
      provider: "whatsapp",
      externalId: "0@g.us",
      name: "Paused Group"
    })
    .run()
  await updateSettings(db, "ws-paused", { queuePaused: true })
  await db
    .insert(delivery)
    .values({
      id: "dl-paused",
      workspaceId: "ws-paused",
      publicationId: pausedPub.id,
      destinationId: "dest-paused",
      status: "scheduled",
      dueAt: new Date(T0.getTime() - 600_000)
    })
    .run()

  const openPub = await createPublication(deal, db, "ws-open")
  await db
    .insert(destination)
    .values({
      id: "dest-open",
      workspaceId: "ws-open",
      provider: "whatsapp",
      externalId: "1@g.us",
      name: "Open Group"
    })
    .run()
  await db
    .insert(delivery)
    .values({
      id: "dl-open",
      workspaceId: "ws-open",
      publicationId: openPub.id,
      destinationId: "dest-open",
      status: "scheduled",
      dueAt: new Date(T0.getTime() - 300_000)
    })
    .run()

  const result = await dispatchDue(db, provider, T0)
  expect(result).not.toBeNull()
  expect(result?.destinationId).toBe("dest-open")
})
