import { testDb } from "@support/db"
import { FakeMessaging } from "@support/fake-messaging"
import { expect, it } from "vitest"
import {
  deliverOne,
  loadPublicationContent
} from "@/features/publications/send/deliver"
import { sendPublication } from "@/features/publications/send/use-case"
import { createPublication } from "@/features/publications/use-case"
import { type Db } from "@/shared/db"
import { DeliveryError } from "@/shared/errors"
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

it("creates one delivery per selected destination", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["Grupo 1", "Grupo 2"])

  const results = await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    new FakeMessaging()
  )

  expect(results).toHaveLength(2)
  expect(await db.select().from(delivery).all()).toHaveLength(2)
  expect(results.every((r) => r.status === "sent")).toBe(true)
})

it("sends our publication content, never the source link", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["Grupo 1"])
  const provider = new FakeMessaging()

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )

  expect(provider.sent[0].content).toContain(
    "https://mercadolivre.com/sec/ours"
  )
  expect(provider.sent[0].content).not.toContain(deal.sourceUrl)
  expect(provider.sent[0].imageUrl).toBe("https://http2.mlstatic.com/a.jpg")
  expect(provider.sent[0].sessionId).toBe(DEFAULT_WORKSPACE_ID)
})

it("does not create a second delivery for the same publication and destination", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["Grupo 1"])
  const provider = new FakeMessaging()

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )
  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )

  expect(await db.select().from(delivery).all()).toHaveLength(1)
})

it("retry does not resend an already sent delivery", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["Grupo 1"])
  const provider = new FakeMessaging()

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )
  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )

  expect(provider.sent).toHaveLength(1)
})

it("sends once when two concurrent deliveries race for the same destination", async () => {
  const { db, pub } = await setup()
  const [dest] = await seed(db, ["Grupo 1"])
  const provider = new FakeMessaging()
  const content = await loadPublicationContent(db, DEFAULT_WORKSPACE_ID, pub.id)
  if (!content) throw new Error("publication content missing")

  const results = await Promise.all([
    deliverOne(db, DEFAULT_WORKSPACE_ID, provider, content, dest),
    deliverOne(db, DEFAULT_WORKSPACE_ID, provider, content, dest)
  ])

  const rows = await db.select().from(delivery).all()
  expect(provider.sent).toHaveLength(1)
  expect(rows).toHaveLength(1)
  expect(rows[0].status).toBe("sent")
  expect(rows[0].attempts).toBe(1)
  expect(results.every((r) => r.status !== "sent")).toBe(false)
})

it("marks a delivery failed on error and a retry can succeed", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["Grupo 1"])
  const provider = new FakeMessaging()
  provider.failNext = true

  const first = await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )
  expect(first[0].status).toBe("failed")

  const second = await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    provider
  )
  expect(second[0].status).toBe("sent")
  expect(provider.sent).toHaveLength(1)

  const row = (await db.select().from(delivery).all())[0]
  expect(row.status).toBe("sent")
  expect(row.attempts).toBe(2)
})

it("marks the publication sent when all deliveries succeed", async () => {
  const { db, pub } = await setup()
  const dests = await seed(db, ["Grupo 1", "Grupo 2"])

  await sendPublication(
    { publicationId: pub.id, destinationIds: dests },
    db,
    DEFAULT_WORKSPACE_ID,
    new FakeMessaging()
  )

  const row = (await db.select().from(publication).all())[0]
  expect(row.status).toBe("sent")
})

it("rejects sending an unknown publication", async () => {
  const { db } = await setup()
  await expect(
    sendPublication(
      { publicationId: "missing", destinationIds: ["dest-0"] },
      db,
      DEFAULT_WORKSPACE_ID,
      new FakeMessaging()
    )
  ).rejects.toBeInstanceOf(DeliveryError)
})

it("validates every destination before sending anything", async () => {
  const { db, pub } = await setup()
  const [valid] = await seed(db, ["Grupo 1"])
  const provider = new FakeMessaging()

  await expect(
    sendPublication(
      { publicationId: pub.id, destinationIds: [valid, "missing"] },
      db,
      DEFAULT_WORKSPACE_ID,
      provider
    )
  ).rejects.toBeInstanceOf(DeliveryError)
  expect(provider.sent).toHaveLength(0)
  expect(await db.select().from(delivery).all()).toHaveLength(0)
})
