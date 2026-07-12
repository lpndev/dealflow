import { expect, it } from "bun:test";
import { listDestinations } from "@/features/destinations/use-case";
import { listQueue } from "@/features/queue/use-case";
import { createDb, type Db } from "@/shared/db";
import {
  affiliateLink,
  dealSnapshot,
  delivery,
  destination,
  product,
  publication,
} from "@/shared/schema";

function seedDest(db: Db, workspaceId: string, id: string) {
  db.insert(destination)
    .values({
      id,
      workspaceId,
      provider: "whatsapp",
      externalId: `${id}@g.us`,
      name: id,
    })
    .run();
}

it("listDestinations returns only the caller's workspace", () => {
  const db = createDb(":memory:");
  seedDest(db, "ws-a", "a1");
  seedDest(db, "ws-b", "b1");
  const a = listDestinations(db, "ws-a");
  expect(a.map((d) => d.id)).toEqual(["a1"]);
  expect(a.some((d) => d.id === "b1")).toBe(false);
});

it("listQueue never leaks another workspace's deliveries", () => {
  const db = createDb(":memory:");
  seedDest(db, "ws-a", "a1");
  seedDest(db, "ws-b", "b1");
  db.insert(product)
    .values({ id: "prod-b", workspaceId: "ws-b", provider: "mercado-livre" })
    .run();
  db.insert(dealSnapshot)
    .values({ id: "d", workspaceId: "ws-b", productId: "prod-b" })
    .run();
  db.insert(affiliateLink)
    .values({ id: "l", workspaceId: "ws-b", productId: "prod-b", url: "x" })
    .run();
  db.insert(publication)
    .values({
      id: "p-b",
      workspaceId: "ws-b",
      dealId: "d",
      affiliateLinkId: "l",
      content: "x",
      status: "ready",
    })
    .run();
  db.insert(delivery)
    .values({
      id: "dl-b",
      workspaceId: "ws-b",
      publicationId: "p-b",
      destinationId: "b1",
      status: "scheduled",
      dueAt: new Date(),
    })
    .run();
  expect(listQueue(db, "ws-a")).toEqual([]);
});
