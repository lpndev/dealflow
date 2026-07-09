import { expect, it } from "bun:test";
import { schedulePublication } from "@/features/publications/schedule/use-case";
import { createPublication } from "@/features/publications/use-case";
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

function setup() {
  const db = createDb(":memory:");
  const pub = createPublication(deal, db);
  return { db, pub };
}

const T0 = new Date("2026-07-08T12:00:00Z");
const noJitter = () => 0;

it("spaces each send by the min delay when jitter is zero", () => {
  const { db, pub } = setup();
  const dests = seed(db, ["G1", "G2", "G3"]);
  updateSettings(db, { delayMinSeconds: 100, delayMaxSeconds: 200 });

  const scheduled = schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    { now: T0, rand: noJitter },
  );

  expect(scheduled.map((s) => s.dueAt.getTime())).toEqual([
    T0.getTime() + 100_000,
    T0.getTime() + 200_000,
    T0.getTime() + 300_000,
  ]);
  const rows = db.select().from(delivery).all();
  expect(rows.every((r) => r.status === "scheduled")).toBe(true);
});

it("keeps a random delay inside the configured range", () => {
  const { db, pub } = setup();
  const dests = seed(db, ["G1"]);
  updateSettings(db, { delayMinSeconds: 100, delayMaxSeconds: 200 });

  const scheduled = schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    { now: T0, rand: () => 0.5 },
  );

  const offset = (scheduled[0].dueAt.getTime() - T0.getTime()) / 1000;
  expect(offset).toBeGreaterThanOrEqual(100);
  expect(offset).toBeLessThanOrEqual(200);
});

it("queues new sends after existing pending ones (global serial)", () => {
  const { db, pub } = setup();
  const [d0, d1] = seed(db, ["G1", "G2"]);
  updateSettings(db, { delayMinSeconds: 100, delayMaxSeconds: 100 });

  db.insert(delivery)
    .values({
      id: "pending-1",
      workspaceId: DEFAULT_WORKSPACE_ID,
      publicationId: pub.id,
      destinationId: d1,
      status: "scheduled",
      dueAt: new Date(T0.getTime() + 1_000_000),
    })
    .run();

  const scheduled = schedulePublication(
    { publicationId: pub.id, destinationIds: [d0] },
    db,
    { now: T0, rand: noJitter },
  );

  expect(scheduled[0].dueAt.getTime()).toBe(T0.getTime() + 1_000_000 + 100_000);
});

it("does not double-schedule the same publication and destination", () => {
  const { db, pub } = setup();
  const dests = seed(db, ["G1"]);

  schedulePublication({ publicationId: pub.id, destinationIds: dests }, db, {
    now: T0,
  });
  const second = schedulePublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    { now: T0 },
  );

  expect(second).toHaveLength(0);
  expect(db.select().from(delivery).all()).toHaveLength(1);
});

it("marks the publication as sending once scheduled", () => {
  const { db, pub } = setup();
  const dests = seed(db, ["G1"]);

  schedulePublication({ publicationId: pub.id, destinationIds: dests }, db, {
    now: T0,
  });

  const row = db.select().from(publication).all()[0];
  expect(row.status).toBe("sending");
});

it("rejects scheduling an unknown publication", () => {
  const { db } = setup();
  expect(() =>
    schedulePublication({ publicationId: "missing", destinationIds: [] }, db),
  ).toThrow(ScheduleError);
});
