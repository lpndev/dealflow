import { testDb } from "@support/db"
import { FakeMessaging } from "@support/fake-messaging"
import { expect, it } from "vitest"
import {
  listDestinations,
  publicDestinations,
  syncDestinations
} from "@/features/destinations/use-case"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

function providerWith(names: string[]) {
  const p = new FakeMessaging()
  p.groups = names.map((name, i) => ({
    provider: "whatsapp",
    externalId: `${i}@g.us`,
    name
  }))
  return p
}

it("syncs groups from the provider", async () => {
  const db = await testDb()
  const provider = providerWith(["Grupo 1", "Grupo 2"])
  const result = await syncDestinations(db, DEFAULT_WORKSPACE_ID, provider)

  expect(result).toHaveLength(2)
  expect(await listDestinations(db, DEFAULT_WORKSPACE_ID)).toHaveLength(2)
  expect(provider.groupsRequestedBy).toEqual([DEFAULT_WORKSPACE_ID])
})

it("is idempotent and updates the name on re-sync", async () => {
  const db = await testDb()
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["Old Name"]))
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["New Name"]))

  const rows = await listDestinations(db, DEFAULT_WORKSPACE_ID)
  expect(rows).toHaveLength(1)
  expect(rows[0].name).toBe("New Name")
})

it("lists destinations with a stable id", async () => {
  const db = await testDb()
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["Grupo 1"]))

  const rows = await listDestinations(db, DEFAULT_WORKSPACE_ID)
  expect(typeof rows[0].id).toBe("string")
  expect(rows[0].externalId).toBe("0@g.us")
})

it("does not expose provider ids in the public response", async () => {
  const db = await testDb()
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["Grupo 1"]))

  const rows = publicDestinations(
    await listDestinations(db, DEFAULT_WORKSPACE_ID)
  )
  expect(rows[0]).toEqual({
    id: expect.any(String),
    name: "Grupo 1",
    enabled: true
  })
  expect("externalId" in rows[0]).toBe(false)
})
