import { testDb } from "@support/db"
import { sql } from "drizzle-orm"
import { afterEach, expect, it } from "vitest"
import { type Db } from "@/shared/db"
import { PlanLimitError } from "@/shared/errors"
import {
  assertCanEnableDestination,
  assertCanSend,
  canAddMember,
  canCreateWorkspace,
  destinationSlotsLeft,
  planStatusForWorkspace,
  TRIAL_DAYS
} from "@/shared/plans"
import {
  accountPlan,
  delivery,
  destination,
  member,
  organization,
  user
} from "@/shared/schema"

const OWNER = "user-owner"

async function freshDb(): Promise<Db> {
  const db = await testDb()
  await db.run(sql`PRAGMA foreign_keys = OFF`)
  return db
}

async function seedUser(db: Db, createdAt: Date, id = OWNER) {
  await db
    .insert(user)
    .values({
      id,
      name: id,
      email: `${id}@x.test`,
      emailVerified: false,
      createdAt,
      updatedAt: createdAt
    })
    .run()
}

async function seedWorkspace(db: Db, wsId: string, ownerId = OWNER) {
  await db
    .insert(organization)
    .values({ id: wsId, name: wsId, slug: wsId, createdAt: new Date() })
    .run()
  await db
    .insert(member)
    .values({
      id: crypto.randomUUID(),
      organizationId: wsId,
      userId: ownerId,
      role: "owner",
      createdAt: new Date()
    })
    .run()
}

async function setPlan(db: Db, plan: string, userId = OWNER) {
  await db
    .insert(accountPlan)
    .values({ userId, plan, updatedAt: new Date() })
    .run()
}

async function seedSends(db: Db, wsId: string, n: number, sentAt: Date) {
  for (let i = 0; i < n; i++) {
    await db
      .insert(delivery)
      .values({
        id: crypto.randomUUID(),
        workspaceId: wsId,
        publicationId: crypto.randomUUID(),
        destinationId: crypto.randomUUID(),
        status: "sent",
        sentAt
      })
      .run()
  }
}

async function seedScheduled(db: Db, wsId: string, n: number) {
  for (let i = 0; i < n; i++) {
    await db
      .insert(delivery)
      .values({
        id: crypto.randomUUID(),
        workspaceId: wsId,
        publicationId: crypto.randomUUID(),
        destinationId: crypto.randomUUID(),
        status: "scheduled",
        dueAt: new Date()
      })
      .run()
  }
}

async function seedGroups(db: Db, wsId: string, n: number) {
  for (let i = 0; i < n; i++) {
    await db
      .insert(destination)
      .values({
        id: crypto.randomUUID(),
        workspaceId: wsId,
        provider: "whatsapp",
        externalId: crypto.randomUUID(),
        name: `g${i}`,
        enabled: true
      })
      .run()
  }
}

afterEach(() => {
  delete process.env.SELF_HOST
})

it("self-host bypasses every limit", async () => {
  process.env.SELF_HOST = "true"
  const db = await freshDb()
  await seedUser(db, new Date(0))
  await seedWorkspace(db, "w1")
  await seedSends(db, "w1", 10_000, new Date())
  await seedGroups(db, "w1", 500)

  await expect(assertCanSend(db, "w1", 1)).resolves.not.toThrow()
  await expect(assertCanEnableDestination(db, "w1")).resolves.not.toThrow()
  expect(await canAddMember(db, "w1")).toBe(true)
  expect(await canCreateWorkspace(db, OWNER)).toBe(true)
  expect((await planStatusForWorkspace(db, "w1")).selfHost).toBe(true)
})

it("send limit aggregates across the owner's workspaces (no per-workspace reset)", async () => {
  const db = await freshDb()
  await seedUser(db, new Date())
  await seedWorkspace(db, "w1")
  await seedWorkspace(db, "w2")
  await seedSends(db, "w1", 60, new Date())
  await seedSends(db, "w2", 39, new Date())

  // 99 used across both — the free cap of 100 is global, so switching to w2
  // does NOT reset the count.
  await expect(assertCanSend(db, "w2", 1)).resolves.not.toThrow()
  await expect(assertCanSend(db, "w2", 2)).rejects.toThrow(PlanLimitError)
})

it("queued (scheduled) sends count toward the monthly cap", async () => {
  const db = await freshDb()
  await seedUser(db, new Date())
  await seedWorkspace(db, "w1")
  await seedWorkspace(db, "w2")
  await seedScheduled(db, "w1", 80)

  // 80 already queued (none sent yet). The free cap of 100 must count the
  // pending queue, so a second batch of 80 can't sneak past by scheduling
  // before the first batch dispatches.
  await expect(assertCanSend(db, "w2", 80)).rejects.toThrow(PlanLimitError)
  await expect(assertCanSend(db, "w2", 20)).resolves.not.toThrow()
})

it("group limit aggregates across the owner's workspaces", async () => {
  const db = await freshDb()
  await seedUser(db, new Date())
  await seedWorkspace(db, "w1")
  await seedWorkspace(db, "w2")
  await seedGroups(db, "w1", 2)
  await seedGroups(db, "w2", 1)

  expect(await destinationSlotsLeft(db, "w2")).toBe(0)
  await expect(assertCanEnableDestination(db, "w2")).rejects.toThrow(
    PlanLimitError
  )
})

it("only counts sends from the current calendar month", async () => {
  const db = await freshDb()
  const now = new Date(2026, 5, 15)
  await seedUser(db, now)
  await seedWorkspace(db, "w1")
  await seedSends(db, "w1", 100, new Date(2026, 4, 20))

  await expect(assertCanSend(db, "w1", 1, now)).resolves.not.toThrow()
})

it("workspace creation is capped per owner (free = 1)", async () => {
  const db = await freshDb()
  await seedUser(db, new Date())

  expect(await canCreateWorkspace(db, OWNER)).toBe(true)
  await seedWorkspace(db, "w1")
  expect(await canCreateWorkspace(db, OWNER)).toBe(false)
})

it("pro plan allows more workspaces and no trial", async () => {
  const db = await freshDb()
  await seedUser(db, new Date(2020, 0, 1))
  await setPlan(db, "pro")
  await seedWorkspace(db, "w1")
  await seedWorkspace(db, "w2")

  expect((await planStatusForWorkspace(db, "w1")).trialExpired).toBe(false)
  expect(await canCreateWorkspace(db, OWNER)).toBe(true)
  await seedWorkspace(db, "w3")
  expect(await canCreateWorkspace(db, OWNER)).toBe(false)
})

it("expired free trial blocks everything for that owner", async () => {
  const db = await freshDb()
  const created = new Date(2026, 0, 1)
  await seedUser(db, created)
  await seedWorkspace(db, "w1")
  const now = new Date(created.getTime() + (TRIAL_DAYS + 1) * 86_400_000)

  await expect(assertCanSend(db, "w1", 1, now)).rejects.toThrow(PlanLimitError)
  await expect(assertCanEnableDestination(db, "w1", now)).rejects.toThrow(
    PlanLimitError
  )
  expect(await canAddMember(db, "w1", now)).toBe(false)
  expect(await canCreateWorkspace(db, OWNER, now)).toBe(false)
})

it("unknown stored plan falls back to free (fail-closed)", async () => {
  const db = await freshDb()
  await seedUser(db, new Date())
  await seedWorkspace(db, "w1")
  await setPlan(db, "enterprise-hack")
  expect((await planStatusForWorkspace(db, "w1")).planId).toBe("free")
})

it("a workspace is governed by its owner's plan, not the viewer", async () => {
  const db = await freshDb()
  await seedUser(db, new Date(2020, 0, 1), "rich-owner")
  await setPlan(db, "business", "rich-owner")
  await seedWorkspace(db, "w1", "rich-owner")
  await seedSends(db, "w1", 5000, new Date())

  await expect(assertCanSend(db, "w1", 1)).resolves.not.toThrow()
  expect((await planStatusForWorkspace(db, "w1")).planId).toBe("business")
})
