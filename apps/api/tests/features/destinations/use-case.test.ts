import { it, expect } from "bun:test";
import { createDb } from "@/shared/db";
import {
  listDestinations,
  syncDestinations,
} from "@/features/destinations/use-case";
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
    providerWith(["Grupo 1", "Grupo 2"]),
  );

  expect(result).toHaveLength(2);
  expect(listDestinations(db)).toHaveLength(2);
});

it("is idempotent and updates the name on re-sync", async () => {
  const db = createDb(":memory:");
  await syncDestinations(db, providerWith(["Old Name"]));
  await syncDestinations(db, providerWith(["New Name"]));

  const rows = listDestinations(db);
  expect(rows).toHaveLength(1);
  expect(rows[0].name).toBe("New Name");
});

it("lists destinations with a stable id", async () => {
  const db = createDb(":memory:");
  await syncDestinations(db, providerWith(["Grupo 1"]));

  const rows = listDestinations(db);
  expect(rows[0].id).toBeString();
  expect(rows[0].externalId).toBe("0@g.us");
});
