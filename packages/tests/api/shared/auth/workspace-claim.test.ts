import { testDb } from "@support/db"
import { eq } from "drizzle-orm"
import { expect, it } from "vitest"
import { resolveActiveWorkspace } from "@/shared/auth/workspace-claim"
import { type Db } from "@/shared/db"
import { destination, member, organization, user } from "@/shared/schema"

async function insertUser(db: Db, id: string) {
  await db
    .insert(user)
    .values({
      id,
      name: "U",
      email: `${id}@example.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .run()
}

async function seedDefaultDestination(db: Db) {
  await db
    .insert(destination)
    .values({
      id: "dest-1",
      workspaceId: "default",
      provider: "whatsapp",
      externalId: "0@g.us",
      name: "g"
    })
    .run()
}

it("does not claim an empty default workspace", async () => {
  const db = await testDb()
  await insertUser(db, "user-1")

  const result = await resolveActiveWorkspace(db, "user-1")

  expect(result).toBeNull()
  const rows = await db
    .select()
    .from(member)
    .where(eq(member.userId, "user-1"))
    .all()
  expect(rows).toHaveLength(0)
})

it("claims default when it holds pre-existing data", async () => {
  const db = await testDb()
  await insertUser(db, "user-1")
  await seedDefaultDestination(db)

  const result = await resolveActiveWorkspace(db, "user-1")

  expect(result).toBe("default")
  const rows = await db
    .select()
    .from(member)
    .where(eq(member.userId, "user-1"))
    .all()
  expect(rows).toHaveLength(1)
  expect(rows[0].organizationId).toBe("default")
  expect(rows[0].role).toBe("owner")
})

it("returns the existing membership without touching default", async () => {
  const db = await testDb()
  await insertUser(db, "user-1")
  await db
    .insert(organization)
    .values({ id: "ws-x", name: "Ws X", slug: "ws-x", createdAt: new Date() })
    .run()
  await db
    .insert(member)
    .values({
      id: "member-1",
      organizationId: "ws-x",
      userId: "user-1",
      role: "owner",
      createdAt: new Date()
    })
    .run()

  const result = await resolveActiveWorkspace(db, "user-1")

  expect(result).toBe("ws-x")
})

it("does not double-claim default for a second user", async () => {
  const db = await testDb()
  await insertUser(db, "user-1")
  await insertUser(db, "user-2")
  await seedDefaultDestination(db)

  await resolveActiveWorkspace(db, "user-1")
  const result = await resolveActiveWorkspace(db, "user-2")

  expect(result).toBeNull()
})
