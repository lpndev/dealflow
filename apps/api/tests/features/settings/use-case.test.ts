import { expect, it } from "bun:test";
import { DEFAULT_TEMPLATE } from "@/features/publications/render";
import { getSettings, updateSettings } from "@/features/settings/use-case";
import { createDb } from "@/shared/db";
import { SettingsError } from "@/shared/errors";

const base = {
  delayMinSeconds: 1200,
  delayMaxSeconds: 2400,
  queuePaused: false,
  messageTemplate: DEFAULT_TEMPLATE,
};

it("returns defaults when nothing is stored", () => {
  const db = createDb(":memory:");
  expect(getSettings(db)).toEqual({
    ...base,
    messageTemplate: DEFAULT_TEMPLATE,
  });
});

it("persists and reads back an updated range", () => {
  const db = createDb(":memory:");
  updateSettings(db, { ...base, delayMinSeconds: 600, delayMaxSeconds: 900 });
  const s = getSettings(db);
  expect(s.delayMinSeconds).toBe(600);
  expect(s.delayMaxSeconds).toBe(900);
});

it("rejects a max below the min", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, {
      ...base,
      delayMinSeconds: 900,
      delayMaxSeconds: 600,
      messageTemplate: DEFAULT_TEMPLATE,
    }),
  ).toThrow(SettingsError);
});

it("rejects negative delays", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, {
      delayMinSeconds: -1,
      delayMaxSeconds: 100,
      messageTemplate: DEFAULT_TEMPLATE,
    }),
  ).toThrow(SettingsError);
});

it("persists a custom message template", () => {
  const db = createDb(":memory:");
  updateSettings(db, { ...base, messageTemplate: "{titulo} → {link}" });
  expect(getSettings(db).messageTemplate).toBe("{titulo} → {link}");
});

it("rejects a template without the affiliate link placeholder", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, { ...base, messageTemplate: "{titulo} sem link" }),
  ).toThrow(SettingsError);
});
