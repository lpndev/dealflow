import { expect, it } from "bun:test";
import { sendPublication } from "@/features/publications/send/use-case";
import { createPublication } from "@/features/publications/use-case";
import { createDb, type Db } from "@/shared/db";
import { DeliveryError } from "@/shared/errors";
import { delivery, destination, publication } from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";
import { FakeMessaging } from "../../support/fake-messaging";

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

it("creates one delivery per selected destination", async () => {
  const { db, pub } = setup();
  const dests = seed(db, ["Grupo 1", "Grupo 2"]);

  const results = await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    new FakeMessaging(),
  );

  expect(results).toHaveLength(2);
  expect(db.select().from(delivery).all()).toHaveLength(2);
  expect(results.every((r) => r.status === "sent")).toBe(true);
});

it("sends our publication content, never the source link", async () => {
  const { db, pub } = setup();
  const dests = seed(db, ["Grupo 1"]);
  const provider = new FakeMessaging();

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );

  expect(provider.sent[0].content).toContain(
    "https://mercadolivre.com/sec/ours",
  );
  expect(provider.sent[0].content).not.toContain(deal.sourceUrl);
  expect(provider.sent[0].imageUrl).toBe("https://img/a.jpg");
});

it("does not create a second delivery for the same publication and destination", async () => {
  const { db, pub } = setup();
  const dests = seed(db, ["Grupo 1"]);
  const provider = new FakeMessaging();

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );
  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );

  expect(db.select().from(delivery).all()).toHaveLength(1);
});

it("retry does not resend an already sent delivery", async () => {
  const { db, pub } = setup();
  const dests = seed(db, ["Grupo 1"]);
  const provider = new FakeMessaging();

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );
  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );

  expect(provider.sent).toHaveLength(1);
});

it("marks a delivery failed on error and a retry can succeed", async () => {
  const { db, pub } = setup();
  const dests = seed(db, ["Grupo 1"]);
  const provider = new FakeMessaging();
  provider.failNext = true;

  const first = await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );
  expect(first[0].status).toBe("failed");

  const second = await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    provider,
  );
  expect(second[0].status).toBe("sent");
  expect(provider.sent).toHaveLength(1);

  const row = db.select().from(delivery).all()[0];
  expect(row.status).toBe("sent");
  expect(row.attempts).toBe(2);
});

it("marks the publication sent when all deliveries succeed", async () => {
  const { db, pub } = setup();
  const dests = seed(db, ["Grupo 1", "Grupo 2"]);

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    new FakeMessaging(),
  );

  const row = db.select().from(publication).all()[0];
  expect(row.status).toBe("sent");
});

it("rejects sending an unknown publication", async () => {
  const { db } = setup();
  expect(
    sendPublication(
      { publicationId: "missing", destinationIds: ["dest-0"] },
      db,
      new FakeMessaging(),
    ),
  ).rejects.toBeInstanceOf(DeliveryError);
});
