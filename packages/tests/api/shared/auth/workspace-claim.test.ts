import { eq } from "drizzle-orm";
import { expect, it } from "vitest";
import { resolveActiveWorkspace } from "@/shared/auth/workspace-claim";
import { createDb, type Db } from "@/shared/db";
import { destination, member, organization, user } from "@/shared/schema";

function insertUser(db: Db, id: string) {
  db.insert(user)
    .values({
      id,
      name: "U",
      email: `${id}@example.com`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .run();
}

function seedDefaultDestination(db: Db) {
  db.insert(destination)
    .values({
      id: "dest-1",
      workspaceId: "default",
      provider: "whatsapp",
      externalId: "0@g.us",
      name: "g",
    })
    .run();
}

it("does not claim an empty default workspace", () => {
  const db = createDb(":memory:");
  insertUser(db, "user-1");

  const result = resolveActiveWorkspace(db, "user-1");

  expect(result).toBeNull();
  const rows = db
    .select()
    .from(member)
    .where(eq(member.userId, "user-1"))
    .all();
  expect(rows).toHaveLength(0);
});

it("claims default when it holds pre-existing data", () => {
  const db = createDb(":memory:");
  insertUser(db, "user-1");
  seedDefaultDestination(db);

  const result = resolveActiveWorkspace(db, "user-1");

  expect(result).toBe("default");
  const rows = db
    .select()
    .from(member)
    .where(eq(member.userId, "user-1"))
    .all();
  expect(rows).toHaveLength(1);
  expect(rows[0].organizationId).toBe("default");
  expect(rows[0].role).toBe("owner");
});

it("returns the existing membership without touching default", () => {
  const db = createDb(":memory:");
  insertUser(db, "user-1");
  db.insert(organization)
    .values({ id: "ws-x", name: "Ws X", slug: "ws-x", createdAt: new Date() })
    .run();
  db.insert(member)
    .values({
      id: "member-1",
      organizationId: "ws-x",
      userId: "user-1",
      role: "owner",
      createdAt: new Date(),
    })
    .run();

  const result = resolveActiveWorkspace(db, "user-1");

  expect(result).toBe("ws-x");
});

it("does not double-claim default for a second user", () => {
  const db = createDb(":memory:");
  insertUser(db, "user-1");
  insertUser(db, "user-2");
  seedDefaultDestination(db);

  resolveActiveWorkspace(db, "user-1");
  const result = resolveActiveWorkspace(db, "user-2");

  expect(result).toBeNull();
});
