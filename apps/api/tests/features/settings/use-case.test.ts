import { it, expect } from "bun:test";
import { createDb } from "@/shared/db";
import { getSettings, updateSettings } from "@/features/settings/use-case";
import { SettingsError } from "@/shared/errors";

it("returns defaults when nothing is stored", () => {
  const db = createDb(":memory:");
  expect(getSettings(db)).toEqual({
    delayMinSeconds: 1200,
    delayMaxSeconds: 2400,
  });
});

it("persists and reads back an updated range", () => {
  const db = createDb(":memory:");
  updateSettings(db, { delayMinSeconds: 600, delayMaxSeconds: 900 });
  expect(getSettings(db)).toEqual({
    delayMinSeconds: 600,
    delayMaxSeconds: 900,
  });
});

it("rejects a max below the min", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, { delayMinSeconds: 900, delayMaxSeconds: 600 }),
  ).toThrow(SettingsError);
});

it("rejects negative delays", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, { delayMinSeconds: -1, delayMaxSeconds: 100 }),
  ).toThrow(SettingsError);
});
