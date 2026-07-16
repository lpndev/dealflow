import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { schedulePublication } from "@/features/publications/schedule/use-case";
import { createPublication } from "@/features/publications/use-case";
import {
  cancelScheduled,
  clearHistory,
  isQueuePaused,
  listHistory,
  listQueue,
  reorderQueue,
  rescheduleDelivery,
  setQueuePaused,
} from "@/features/queue/use-case";
import { updateSettings } from "@/features/settings/use-case";
import { createDb, type Db } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import { delivery, destination, publication } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

const deal = {
  title: "Air Fryer",
  imageUrl: "https://http2.mlstatic.com/a.jpg",
  currentPrice: "299,90",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours",
};

const T0 = new Date("2026-07-08T12:00:00Z");

function seed(db: Db, names: string[]): string[] {
  return names.map((name, i) => {
    const id = `dest-${i}`;
    db.insert(destination)
      .values({
        id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        provider: "whatsapp",
        externalId: `${i}@g.us`,
        name,
      })
      .run();
    return id;
  });
}

function setup(names: string[]) {
  const db = createDb(":memory:");
  const pub = createPublication(deal, db, DEFAULT_WORKSPACE_ID);
  const dests = seed(db, names);
  updateSettings(db, DEFAULT_WORKSPACE_ID, {
    delayMinSeconds: 100,
    delayMaxSeconds: 100,
  });
  schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    { now: T0, rand: () => 0 },
  );
  return { db, pub };
}

it("cancels a scheduled delivery and removes it from the queue", () => {
  const { db } = setup(["G1", "G2"]);
  const first = listQueue(db, DEFAULT_WORKSPACE_ID)[0];

  cancelScheduled(db, DEFAULT_WORKSPACE_ID, first.id);

  const remaining = listQueue(db, DEFAULT_WORKSPACE_ID);
  expect(remaining).toHaveLength(1);
  expect(remaining.map((r) => r.id)).not.toContain(first.id);
});

it("resets the publication to ready when its last item is cancelled", () => {
  const { db, pub } = setup(["G1"]);
  const only = listQueue(db, DEFAULT_WORKSPACE_ID)[0];

  cancelScheduled(db, DEFAULT_WORKSPACE_ID, only.id);

  const row = db
    .select()
    .from(publication)
    .where(eq(publication.id, pub.id))
    .get();
  expect(row?.status).toBe("ready");
});

it("refuses to cancel a delivery that already sent", () => {
  const { db } = setup(["G1"]);
  const only = listQueue(db, DEFAULT_WORKSPACE_ID)[0];
  db.update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, only.id))
    .run();

  expect(() => cancelScheduled(db, DEFAULT_WORKSPACE_ID, only.id)).toThrow(
    ScheduleError,
  );
});

it("reorders items by reassigning the same time slots to the new order", () => {
  const { db } = setup(["G1", "G2", "G3"]);
  const before = listQueue(db, DEFAULT_WORKSPACE_ID);
  const slots = before.map((i) => i.dueAt?.getTime());
  const reversed = [...before].reverse().map((i) => i.id);

  reorderQueue(db, DEFAULT_WORKSPACE_ID, reversed);

  const after = listQueue(db, DEFAULT_WORKSPACE_ID);
  expect(after.map((i) => i.id)).toEqual(reversed);
  expect(after.map((i) => i.dueAt?.getTime())).toEqual(slots);
});

it("rejects reordering with an id that is not scheduled", () => {
  const { db } = setup(["G1"]);
  const only = listQueue(db, DEFAULT_WORKSPACE_ID)[0];

  expect(() =>
    reorderQueue(db, DEFAULT_WORKSPACE_ID, [only.id, "bogus"]),
  ).toThrow(ScheduleError);
});

it("reschedules a scheduled delivery to a new due time", () => {
  const { db } = setup(["G1"]);
  const only = listQueue(db, DEFAULT_WORKSPACE_ID)[0];
  const when = new Date("2026-07-10T15:00:00Z");

  rescheduleDelivery(db, DEFAULT_WORKSPACE_ID, only.id, when);

  expect(listQueue(db, DEFAULT_WORKSPACE_ID)[0].dueAt?.getTime()).toBe(
    when.getTime(),
  );
});

it("refuses to reschedule a delivery that already sent", () => {
  const { db } = setup(["G1"]);
  const only = listQueue(db, DEFAULT_WORKSPACE_ID)[0];
  db.update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, only.id))
    .run();

  expect(() =>
    rescheduleDelivery(
      db,
      DEFAULT_WORKSPACE_ID,
      only.id,
      new Date("2026-07-10T15:00:00Z"),
    ),
  ).toThrow(ScheduleError);
});

it("toggles the queue paused flag", () => {
  const { db } = setup(["G1"]);
  expect(isQueuePaused(db, DEFAULT_WORKSPACE_ID)).toBe(false);

  setQueuePaused(db, DEFAULT_WORKSPACE_ID, true);
  expect(isQueuePaused(db, DEFAULT_WORKSPACE_ID)).toBe(true);

  setQueuePaused(db, DEFAULT_WORKSPACE_ID, false);
  expect(isQueuePaused(db, DEFAULT_WORKSPACE_ID)).toBe(false);
});

it("clears only sent and failed deliveries from history", () => {
  const { db } = setup(["G1", "G2"]);
  const items = listQueue(db, DEFAULT_WORKSPACE_ID);
  db.update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, items[0].id))
    .run();

  clearHistory(db, DEFAULT_WORKSPACE_ID);

  expect(listHistory(db, DEFAULT_WORKSPACE_ID)).toHaveLength(0);
  expect(listQueue(db, DEFAULT_WORKSPACE_ID).map((i) => i.id)).toEqual([
    items[1].id,
  ]);
});
