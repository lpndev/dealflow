import { sql } from "drizzle-orm"
import { afterEach, expect, it } from "vitest"
import { createDb, type Db } from "@/shared/db"
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

function freshDb(): Db {
  const db = createDb(":memory:")
  db.run(sql`PRAGMA foreign_keys = OFF`)
  return db
}

function seedUser(db: Db, createdAt: Date, id = OWNER) {
  db.insert(user)
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

function seedWorkspace(db: Db, wsId: string, ownerId = OWNER) {
  db.insert(organization)
    .values({ id: wsId, name: wsId, slug: wsId, createdAt: new Date() })
    .run()
  db.insert(member)
    .values({
      id: crypto.randomUUID(),
      organizationId: wsId,
      userId: ownerId,
      role: "owner",
      createdAt: new Date()
    })
    .run()
}

function setPlan(db: Db, plan: string, userId = OWNER) {
  db.insert(accountPlan).values({ userId, plan, updatedAt: new Date() }).run()
}

function seedSends(db: Db, wsId: string, n: number, sentAt: Date) {
  for (let i = 0; i < n; i++) {
    db.insert(delivery)
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

function seedScheduled(db: Db, wsId: string, n: number) {
  for (let i = 0; i < n; i++) {
    db.insert(delivery)
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

function seedGroups(db: Db, wsId: string, n: number) {
  for (let i = 0; i < n; i++) {
    db.insert(destination)
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

it("self-host bypasses every limit", () => {
  process.env.SELF_HOST = "true"
  const db = freshDb()
  seedUser(db, new Date(0))
  seedWorkspace(db, "w1")
  seedSends(db, "w1", 10_000, new Date())
  seedGroups(db, "w1", 500)

  expect(() => assertCanSend(db, "w1", 1)).not.toThrow()
  expect(() => assertCanEnableDestination(db, "w1")).not.toThrow()
  expect(canAddMember(db, "w1")).toBe(true)
  expect(canCreateWorkspace(db, OWNER)).toBe(true)
  expect(planStatusForWorkspace(db, "w1").selfHost).toBe(true)
})

it("send limit aggregates across the owner's workspaces (no per-workspace reset)", () => {
  const db = freshDb()
  seedUser(db, new Date())
  seedWorkspace(db, "w1")
  seedWorkspace(db, "w2")
  seedSends(db, "w1", 60, new Date())
  seedSends(db, "w2", 39, new Date())

  // 99 used across both — the free cap of 100 is global, so switching to w2
  // does NOT reset the count.
  expect(() => assertCanSend(db, "w2", 1)).not.toThrow()
  expect(() => assertCanSend(db, "w2", 2)).toThrow(PlanLimitError)
})

it("queued (scheduled) sends count toward the monthly cap", () => {
  const db = freshDb()
  seedUser(db, new Date())
  seedWorkspace(db, "w1")
  seedWorkspace(db, "w2")
  seedScheduled(db, "w1", 80)

  // 80 already queued (none sent yet). The free cap of 100 must count the
  // pending queue, so a second batch of 80 can't sneak past by scheduling
  // before the first batch dispatches.
  expect(() => assertCanSend(db, "w2", 80)).toThrow(PlanLimitError)
  expect(() => assertCanSend(db, "w2", 20)).not.toThrow()
})

it("group limit aggregates across the owner's workspaces", () => {
  const db = freshDb()
  seedUser(db, new Date())
  seedWorkspace(db, "w1")
  seedWorkspace(db, "w2")
  seedGroups(db, "w1", 2)
  seedGroups(db, "w2", 1)

  expect(destinationSlotsLeft(db, "w2")).toBe(0)
  expect(() => assertCanEnableDestination(db, "w2")).toThrow(PlanLimitError)
})

it("only counts sends from the current calendar month", () => {
  const db = freshDb()
  const now = new Date(2026, 5, 15)
  seedUser(db, now)
  seedWorkspace(db, "w1")
  seedSends(db, "w1", 100, new Date(2026, 4, 20))

  expect(() => assertCanSend(db, "w1", 1, now)).not.toThrow()
})

it("workspace creation is capped per owner (free = 1)", () => {
  const db = freshDb()
  seedUser(db, new Date())

  expect(canCreateWorkspace(db, OWNER)).toBe(true)
  seedWorkspace(db, "w1")
  expect(canCreateWorkspace(db, OWNER)).toBe(false)
})

it("pro plan allows more workspaces and no trial", () => {
  const db = freshDb()
  seedUser(db, new Date(2020, 0, 1))
  setPlan(db, "pro")
  seedWorkspace(db, "w1")
  seedWorkspace(db, "w2")

  expect(planStatusForWorkspace(db, "w1").trialExpired).toBe(false)
  expect(canCreateWorkspace(db, OWNER)).toBe(true)
  seedWorkspace(db, "w3")
  expect(canCreateWorkspace(db, OWNER)).toBe(false)
})

it("expired free trial blocks everything for that owner", () => {
  const db = freshDb()
  const created = new Date(2026, 0, 1)
  seedUser(db, created)
  seedWorkspace(db, "w1")
  const now = new Date(created.getTime() + (TRIAL_DAYS + 1) * 86_400_000)

  expect(() => assertCanSend(db, "w1", 1, now)).toThrow(PlanLimitError)
  expect(() => assertCanEnableDestination(db, "w1", now)).toThrow(
    PlanLimitError
  )
  expect(canAddMember(db, "w1", now)).toBe(false)
  expect(canCreateWorkspace(db, OWNER, now)).toBe(false)
})

it("unknown stored plan falls back to free (fail-closed)", () => {
  const db = freshDb()
  seedUser(db, new Date())
  seedWorkspace(db, "w1")
  setPlan(db, "enterprise-hack")
  expect(planStatusForWorkspace(db, "w1").planId).toBe("free")
})

it("a workspace is governed by its owner's plan, not the viewer", () => {
  const db = freshDb()
  seedUser(db, new Date(2020, 0, 1), "rich-owner")
  setPlan(db, "business", "rich-owner")
  seedWorkspace(db, "w1", "rich-owner")
  seedSends(db, "w1", 5000, new Date())

  expect(() => assertCanSend(db, "w1", 1)).not.toThrow()
  expect(planStatusForWorkspace(db, "w1").planId).toBe("business")
})
