import { testDb } from "@support/db"
import { expect, it } from "vitest"
import { libsqlUrl, resolveDatabaseUrl } from "@/shared/db"
import { delivery } from "@/shared/schema"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

it("uses an in-memory database in tests", () => {
  expect(resolveDatabaseUrl({ NODE_ENV: "test" })).toBe(":memory:")
})

it("keeps an explicit database override", () => {
  expect(
    resolveDatabaseUrl({ NODE_ENV: "test", DATABASE_URL: "/tmp/custom.db" })
  ).toBe("/tmp/custom.db")
})

it("builds a libsql url without double-prefixing an existing file url", () => {
  expect(libsqlUrl("local.db")).toBe("file:local.db")
  expect(libsqlUrl("file:local.db")).toBe("file:local.db")
  expect(libsqlUrl(":memory:")).toBe(":memory:")
  expect(libsqlUrl("libsql://db.turso.io")).toBe("libsql://db.turso.io")
  expect(libsqlUrl("https://db.turso.io")).toBe("https://db.turso.io")
})

it("enforces foreign keys", async () => {
  const db = await testDb()
  await expect(
    db
      .insert(delivery)
      .values({
        id: "d1",
        workspaceId: DEFAULT_WORKSPACE_ID,
        publicationId: "missing-publication",
        destinationId: "missing-destination"
      })
      .run()
  ).rejects.toThrow()
})

it("resolves the default independently from the process cwd", () => {
  expect(
    resolveDatabaseUrl({ NODE_ENV: "production" }).endsWith(
      "/apps/api/dealflow.db"
    )
  ).toBe(true)
})
