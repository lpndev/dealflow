import { testDb } from "@support/db"
import { expect, it } from "vitest"
import { DEFAULT_TEMPLATE } from "@/features/publications/render"
import { getSettings, updateSettings } from "@/features/settings/use-case"
import { SettingsError } from "@/shared/errors"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

const base = {
  delayMinSeconds: 1200,
  delayMaxSeconds: 2400,
  queuePaused: false,
  messageTemplate: DEFAULT_TEMPLATE,
  mlAffiliateTag: null
}

it("returns defaults when nothing is stored", async () => {
  const db = await testDb()
  expect(await getSettings(db, DEFAULT_WORKSPACE_ID)).toEqual({
    ...base,
    messageTemplate: DEFAULT_TEMPLATE
  })
})

it("persists and reads back an updated range", async () => {
  const db = await testDb()
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    ...base,
    delayMinSeconds: 600,
    delayMaxSeconds: 900
  })
  const s = await getSettings(db, DEFAULT_WORKSPACE_ID)
  expect(s.delayMinSeconds).toBe(600)
  expect(s.delayMaxSeconds).toBe(900)
})

it("rejects a max below the min", async () => {
  const db = await testDb()
  await expect(
    updateSettings(db, DEFAULT_WORKSPACE_ID, {
      ...base,
      delayMinSeconds: 900,
      delayMaxSeconds: 600,
      messageTemplate: DEFAULT_TEMPLATE
    })
  ).rejects.toThrow(SettingsError)
})

it("rejects negative delays", async () => {
  const db = await testDb()
  await expect(
    updateSettings(db, DEFAULT_WORKSPACE_ID, {
      delayMinSeconds: -1,
      delayMaxSeconds: 100,
      messageTemplate: DEFAULT_TEMPLATE
    })
  ).rejects.toThrow(SettingsError)
})

it("persists a custom message template", async () => {
  const db = await testDb()
  await updateSettings(db, DEFAULT_WORKSPACE_ID, {
    ...base,
    messageTemplate: "{titulo} → {link}"
  })
  expect((await getSettings(db, DEFAULT_WORKSPACE_ID)).messageTemplate).toBe(
    "{titulo} → {link}"
  )
})

it("rejects a template without the affiliate link placeholder", async () => {
  const db = await testDb()
  await expect(
    updateSettings(db, DEFAULT_WORKSPACE_ID, {
      ...base,
      messageTemplate: "{titulo} sem link"
    })
  ).rejects.toThrow(SettingsError)
})
