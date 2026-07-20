import { expect, it } from "vitest"
import { isWorkspaceMember } from "@/shared/auth"
import { createDb } from "@/shared/db"
import { member, organization, user } from "@/shared/schema"

it("revokes workspace access as soon as membership is removed", () => {
  const db = createDb(":memory:")
  db.insert(user)
    .values({
      id: "user-1",
      name: "User",
      email: "user@example.com",
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .run()
  db.insert(organization)
    .values({ id: "ws-1", name: "Ws", slug: "ws-1", createdAt: new Date() })
    .run()
  db.insert(member)
    .values({
      id: "member-1",
      organizationId: "ws-1",
      userId: "user-1",
      role: "member",
      createdAt: new Date()
    })
    .run()

  expect(isWorkspaceMember(db, "user-1", "ws-1")).toBe(true)
  db.delete(member).run()
  expect(isWorkspaceMember(db, "user-1", "ws-1")).toBe(false)
})

it("does not accept membership in a different workspace", () => {
  const db = createDb(":memory:")
  expect(isWorkspaceMember(db, "user-1", "ws-2")).toBe(false)
})
