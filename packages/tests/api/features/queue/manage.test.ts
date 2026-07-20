import { setupScheduled as setup } from "@support/seed"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"
import {
  cancelScheduled,
  clearHistory,
  isQueuePaused,
  listHistory,
  listQueue,
  reorderQueue,
  rescheduleDelivery,
  setQueuePaused
} from "@/features/queue/use-case"
import { ScheduleError } from "@/shared/errors"
import { delivery, publication } from "@/shared/schema"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

it("cancels a scheduled delivery and removes it from the queue", async () => {
  const { db } = await setup(["G1", "G2"])
  const first = (await listQueue(db, DEFAULT_WORKSPACE_ID))[0]

  await cancelScheduled(db, DEFAULT_WORKSPACE_ID, first.id)

  const remaining = await listQueue(db, DEFAULT_WORKSPACE_ID)
  expect(remaining).toHaveLength(1)
  expect(remaining.map((r) => r.id)).not.toContain(first.id)
})

it("resets the publication to ready when its last item is cancelled", async () => {
  const { db, pub } = await setup(["G1"])
  const only = (await listQueue(db, DEFAULT_WORKSPACE_ID))[0]

  await cancelScheduled(db, DEFAULT_WORKSPACE_ID, only.id)

  const row = await db
    .select()
    .from(publication)
    .where(eq(publication.id, pub.id))
    .get()
  expect(row?.status).toBe("ready")
})

it("refuses to cancel a delivery that already sent", async () => {
  const { db } = await setup(["G1"])
  const only = (await listQueue(db, DEFAULT_WORKSPACE_ID))[0]
  await db
    .update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, only.id))
    .run()

  await expect(
    cancelScheduled(db, DEFAULT_WORKSPACE_ID, only.id)
  ).rejects.toThrow(ScheduleError)
})

it("reorders items by reassigning the same time slots to the new order", async () => {
  const { db } = await setup(["G1", "G2", "G3"])
  const before = await listQueue(db, DEFAULT_WORKSPACE_ID)
  const slots = before.map((i) => i.dueAt?.getTime())
  const reversed = [...before].reverse().map((i) => i.id)

  await reorderQueue(db, DEFAULT_WORKSPACE_ID, reversed)

  const after = await listQueue(db, DEFAULT_WORKSPACE_ID)
  expect(after.map((i) => i.id)).toEqual(reversed)
  expect(after.map((i) => i.dueAt?.getTime())).toEqual(slots)
})

it("rejects reordering with an id that is not scheduled", async () => {
  const { db } = await setup(["G1"])
  const only = (await listQueue(db, DEFAULT_WORKSPACE_ID))[0]

  await expect(
    reorderQueue(db, DEFAULT_WORKSPACE_ID, [only.id, "bogus"])
  ).rejects.toThrow(ScheduleError)
})

it("reschedules a scheduled delivery to a new due time", async () => {
  const { db } = await setup(["G1"])
  const only = (await listQueue(db, DEFAULT_WORKSPACE_ID))[0]
  const when = new Date("2026-07-10T15:00:00Z")

  await rescheduleDelivery(db, DEFAULT_WORKSPACE_ID, only.id, when)

  expect((await listQueue(db, DEFAULT_WORKSPACE_ID))[0].dueAt?.getTime()).toBe(
    when.getTime()
  )
})

it("refuses to reschedule a delivery that already sent", async () => {
  const { db } = await setup(["G1"])
  const only = (await listQueue(db, DEFAULT_WORKSPACE_ID))[0]
  await db
    .update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, only.id))
    .run()

  await expect(
    rescheduleDelivery(
      db,
      DEFAULT_WORKSPACE_ID,
      only.id,
      new Date("2026-07-10T15:00:00Z")
    )
  ).rejects.toThrow(ScheduleError)
})

it("toggles the queue paused flag", async () => {
  const { db } = await setup(["G1"])
  expect(await isQueuePaused(db, DEFAULT_WORKSPACE_ID)).toBe(false)

  await setQueuePaused(db, DEFAULT_WORKSPACE_ID, true)
  expect(await isQueuePaused(db, DEFAULT_WORKSPACE_ID)).toBe(true)

  await setQueuePaused(db, DEFAULT_WORKSPACE_ID, false)
  expect(await isQueuePaused(db, DEFAULT_WORKSPACE_ID)).toBe(false)
})

it("clears only sent and failed deliveries from history", async () => {
  const { db } = await setup(["G1", "G2"])
  const items = await listQueue(db, DEFAULT_WORKSPACE_ID)
  await db
    .update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, items[0].id))
    .run()

  await clearHistory(db, DEFAULT_WORKSPACE_ID)

  expect(await listHistory(db, DEFAULT_WORKSPACE_ID)).toHaveLength(0)
  expect((await listQueue(db, DEFAULT_WORKSPACE_ID)).map((i) => i.id)).toEqual([
    items[1].id
  ])

  const archived = await db
    .select()
    .from(delivery)
    .where(eq(delivery.id, items[0].id))
    .get()
  expect(archived?.status).toBe("sent")
  expect(archived?.archivedAt).toBeInstanceOf(Date)
})
