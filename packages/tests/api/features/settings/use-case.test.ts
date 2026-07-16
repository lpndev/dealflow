import { expect, it } from "vitest";
import { DEFAULT_TEMPLATE } from "@/features/publications/render";
import { getSettings, updateSettings } from "@/features/settings/use-case";
import { createDb } from "@/shared/db";
import { SettingsError } from "@/shared/errors";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

const base = {
  delayMinSeconds: 1200,
  delayMaxSeconds: 2400,
  queuePaused: false,
  messageTemplate: DEFAULT_TEMPLATE,
  mlAffiliateTag: null,
};

it("returns defaults when nothing is stored", () => {
  const db = createDb(":memory:");
  expect(getSettings(db, DEFAULT_WORKSPACE_ID)).toEqual({
    ...base,
    messageTemplate: DEFAULT_TEMPLATE,
  });
});

it("persists and reads back an updated range", () => {
  const db = createDb(":memory:");
  updateSettings(db, DEFAULT_WORKSPACE_ID, {
    ...base,
    delayMinSeconds: 600,
    delayMaxSeconds: 900,
  });
  const s = getSettings(db, DEFAULT_WORKSPACE_ID);
  expect(s.delayMinSeconds).toBe(600);
  expect(s.delayMaxSeconds).toBe(900);
});

it("rejects a max below the min", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, DEFAULT_WORKSPACE_ID, {
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
    updateSettings(db, DEFAULT_WORKSPACE_ID, {
      delayMinSeconds: -1,
      delayMaxSeconds: 100,
      messageTemplate: DEFAULT_TEMPLATE,
    }),
  ).toThrow(SettingsError);
});

it("persists a custom message template", () => {
  const db = createDb(":memory:");
  updateSettings(db, DEFAULT_WORKSPACE_ID, {
    ...base,
    messageTemplate: "{titulo} → {link}",
  });
  expect(getSettings(db, DEFAULT_WORKSPACE_ID).messageTemplate).toBe(
    "{titulo} → {link}",
  );
});

it("rejects a template without the affiliate link placeholder", () => {
  const db = createDb(":memory:");
  expect(() =>
    updateSettings(db, DEFAULT_WORKSPACE_ID, {
      ...base,
      messageTemplate: "{titulo} sem link",
    }),
  ).toThrow(SettingsError);
});
