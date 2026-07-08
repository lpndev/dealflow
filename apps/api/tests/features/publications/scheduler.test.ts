import { it, expect } from "bun:test";
import { createDb, type Db } from "@/shared/db";
import { createPublication } from "@/features/publications/use-case";
import { schedulePublication } from "@/features/publications/schedule/use-case";
import { dispatchDue } from "@/features/publications/schedule/scheduler";
import { updateSettings } from "@/features/settings/use-case";
import { destination, publication } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";
import { FakeMessaging } from "../../support/fake-messaging";

const deal = {
  title: "Air Fryer",
  imageUrl: "https://img/a.jpg",
  currentPrice: "299,90",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours",
};

const T0 = new Date("2026-07-08T12:00:00Z");
const past = new Date(T0.getTime() + 300_000);

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
  return { db, pub, dests };
}

it("dispatches one due send at a time, earliest first", async () => {
  const { db, dests } = setup(["G1", "G2"]);
  const provider = new FakeMessaging();

  const r1 = await dispatchDue(db, provider, past);
  expect(r1?.destinationId).toBe(dests[0]);
  expect(provider.sent).toHaveLength(1);

  const r2 = await dispatchDue(db, provider, past);
  expect(r2?.destinationId).toBe(dests[1]);

  const r3 = await dispatchDue(db, provider, past);
  expect(r3).toBeNull();
  expect(provider.sent).toHaveLength(2);
});

it("does not dispatch a send before it is due", async () => {
  const { db } = setup(["G1"]);
  const provider = new FakeMessaging();

  const r = await dispatchDue(db, provider, new Date(T0.getTime() + 50_000));
  expect(r).toBeNull();
  expect(provider.sent).toHaveLength(0);
});

it("marks the publication sent once every due send goes out", async () => {
  const { db, pub } = setup(["G1", "G2"]);
  const provider = new FakeMessaging();

  await dispatchDue(db, provider, past);
  await dispatchDue(db, provider, past);

  const row = db
    .select()
    .from(publication)
    .all()
    .find((p) => p.id === pub.id);
  expect(row?.status).toBe("sent");
});

it("marks a failed send failed and does not auto-retry it", async () => {
  const { db } = setup(["G1"]);
  const provider = new FakeMessaging();
  provider.failNext = true;

  const failed = await dispatchDue(db, provider, past);
  expect(failed?.status).toBe("failed");

  const retry = await dispatchDue(db, provider, past);
  expect(retry).toBeNull();
});
