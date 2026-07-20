import { testDb } from "@support/db"
import { expect, it } from "vitest"
import { listDestinations } from "@/features/destinations/use-case"
import { listQueue } from "@/features/queue/use-case"
import { type Db } from "@/shared/db"
import {
  affiliateLink,
  dealSnapshot,
  delivery,
  destination,
  product,
  publication
} from "@/shared/schema"

async function seedDest(db: Db, workspaceId: string, id: string) {
  await db
    .insert(destination)
    .values({
      id,
      workspaceId,
      provider: "whatsapp",
      externalId: `${id}@g.us`,
      name: id
    })
    .run()
}

it("listDestinations returns only the caller's workspace", async () => {
  const db = await testDb()
  await seedDest(db, "ws-a", "a1")
  await seedDest(db, "ws-b", "b1")
  const a = await listDestinations(db, "ws-a")
  expect(a.map((d) => d.id)).toEqual(["a1"])
  expect(a.some((d) => d.id === "b1")).toBe(false)
})

it("listQueue never leaks another workspace's deliveries", async () => {
  const db = await testDb()
  await seedDest(db, "ws-a", "a1")
  await seedDest(db, "ws-b", "b1")
  await db
    .insert(product)
    .values({ id: "prod-b", workspaceId: "ws-b", provider: "mercado-livre" })
    .run()
  await db
    .insert(dealSnapshot)
    .values({ id: "d", workspaceId: "ws-b", productId: "prod-b" })
    .run()
  await db
    .insert(affiliateLink)
    .values({ id: "l", workspaceId: "ws-b", productId: "prod-b", url: "x" })
    .run()
  await db
    .insert(publication)
    .values({
      id: "p-b",
      workspaceId: "ws-b",
      dealId: "d",
      affiliateLinkId: "l",
      content: "x",
      status: "ready"
    })
    .run()
  await db
    .insert(delivery)
    .values({
      id: "dl-b",
      workspaceId: "ws-b",
      publicationId: "p-b",
      destinationId: "b1",
      status: "scheduled",
      dueAt: new Date()
    })
    .run()
  expect(await listQueue(db, "ws-a")).toEqual([])
})

it("listQueue rejects cross-workspace relations even if the database is inconsistent", async () => {
  const db = await testDb()
  await seedDest(db, "ws-a", "a1")
  await db
    .insert(product)
    .values({ id: "prod-b", workspaceId: "ws-b", provider: "mercado-livre" })
    .run()
  await db
    .insert(dealSnapshot)
    .values({ id: "deal-b", workspaceId: "ws-b", productId: "prod-b" })
    .run()
  await db
    .insert(affiliateLink)
    .values({
      id: "link-b",
      workspaceId: "ws-b",
      productId: "prod-b",
      url: "x"
    })
    .run()
  await db
    .insert(publication)
    .values({
      id: "pub-a",
      workspaceId: "ws-a",
      dealId: "deal-b",
      affiliateLinkId: "link-b",
      content: "secret title from ws-b"
    })
    .run()
  await db
    .insert(delivery)
    .values({
      id: "delivery-a",
      workspaceId: "ws-a",
      publicationId: "pub-a",
      destinationId: "a1",
      status: "scheduled",
      dueAt: new Date()
    })
    .run()

  expect(await listQueue(db, "ws-a")).toEqual([])
})
