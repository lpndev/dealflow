import { expect, it } from "bun:test";
import {
  listDestinations,
  syncDestinations,
} from "@/features/destinations/use-case";
import { createDb } from "@/shared/db";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";
import { FakeMessaging } from "../../support/fake-messaging";

function providerWith(names: string[]) {
  const p = new FakeMessaging();
  p.groups = names.map((name, i) => ({
    provider: "whatsapp",
    externalId: `${i}@g.us`,
    name,
  }));
  return p;
}

it("syncs groups from the provider", async () => {
  const db = createDb(":memory:");
  const result = await syncDestinations(
    db,
    DEFAULT_WORKSPACE_ID,
    providerWith(["Grupo 1", "Grupo 2"]),
  );

  expect(result).toHaveLength(2);
  expect(listDestinations(db, DEFAULT_WORKSPACE_ID)).toHaveLength(2);
});

it("is idempotent and updates the name on re-sync", async () => {
  const db = createDb(":memory:");
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["Old Name"]));
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["New Name"]));

  const rows = listDestinations(db, DEFAULT_WORKSPACE_ID);
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe("New Name");
});

it("lists destinations with a stable id", async () => {
  const db = createDb(":memory:");
  await syncDestinations(db, DEFAULT_WORKSPACE_ID, providerWith(["Grupo 1"]));

  const rows = listDestinations(db, DEFAULT_WORKSPACE_ID);
  expect(rows[0].id).toBeString();
  expect(rows[0].externalId).toBe("0@g.us");
});
