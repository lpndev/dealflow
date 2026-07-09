import { expect, it } from "bun:test";
import { eq } from "drizzle-orm";
import { schedulePublication } from "@/features/publications/schedule/use-case";
import { createPublication } from "@/features/publications/use-case";
import {
  cancelScheduled,
  listQueue,
  reorderQueue,
} from "@/features/queue/use-case";
import { updateSettings } from "@/features/settings/use-case";
import { createDb, type Db } from "@/shared/db";
import { ScheduleError } from "@/shared/errors";
import { delivery, destination, publication } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

const deal = {
  title: "Air Fryer",
  imageUrl: "https://img/a.jpg",
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
  const pub = createPublication(deal, db);
  const dests = seed(db, names);
  updateSettings(db, { delayMinSeconds: 100, delayMaxSeconds: 100 });
  schedulePublication({ publicationId: pub.id, destinationIds: dests }, db, {
    now: T0,
    rand: () => 0,
  });
  return { db, pub };
}

it("cancels a scheduled delivery and removes it from the queue", () => {
  const { db } = setup(["G1", "G2"]);
  const first = listQueue(db)[0];

  cancelScheduled(db, first.id);

  const remaining = listQueue(db);
  expect(remaining).toHaveLength(1);
  expect(remaining.map((r) => r.id)).not.toContain(first.id);
});

it("resets the publication to ready when its last item is cancelled", () => {
  const { db, pub } = setup(["G1"]);
  const only = listQueue(db)[0];

  cancelScheduled(db, only.id);

  const row = db
    .select()
    .from(publication)
    .where(eq(publication.id, pub.id))
    .get();
  expect(row?.status).toBe("ready");
});

it("refuses to cancel a delivery that already sent", () => {
  const { db } = setup(["G1"]);
  const only = listQueue(db)[0];
  db.update(delivery)
    .set({ status: "sent" })
    .where(eq(delivery.id, only.id))
    .run();

  expect(() => cancelScheduled(db, only.id)).toThrow(ScheduleError);
});

it("reorders items by reassigning the same time slots to the new order", () => {
  const { db } = setup(["G1", "G2", "G3"]);
  const before = listQueue(db);
  const slots = before.map((i) => i.dueAt?.getTime());
  const reversed = [...before].reverse().map((i) => i.id);

  reorderQueue(db, reversed);

  const after = listQueue(db);
  expect(after.map((i) => i.id)).toEqual(reversed);
  expect(after.map((i) => i.dueAt?.getTime())).toEqual(slots);
});

it("rejects reordering with an id that is not scheduled", () => {
  const { db } = setup(["G1"]);
  const only = listQueue(db)[0];

  expect(() => reorderQueue(db, [only.id, "bogus"])).toThrow(ScheduleError);
});
