import { testDb } from "@support/db"
import { expect, it } from "vitest"
import {
  createPublication,
  previewPublication
} from "@/features/publications/use-case"
import { PublicationError } from "@/shared/errors"
import {
  affiliateLink,
  dealSnapshot,
  product,
  publication
} from "@/shared/schema"
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace"

async function db() {
  return await testDb()
}

const valid = {
  title: "Air Fryer Mondial 5L",
  imageUrl: "https://http2.mlstatic.com/a.jpg",
  originalPrice: "499,90",
  currentPrice: "299,90",
  coupon: "CASA20",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours",
  externalId: "MLB123"
}

it("persists a publication and returns ready content", async () => {
  const conn = await db()
  const result = await createPublication(valid, conn, DEFAULT_WORKSPACE_ID)

  expect(result.status).toBe("ready")
  expect(result.content).toContain("Air Fryer Mondial 5L")
  expect(result.content).toContain("R$ 299,90")

  expect(await conn.select().from(product).all()).toHaveLength(1)
  expect(await conn.select().from(dealSnapshot).all()).toHaveLength(1)
  expect(await conn.select().from(affiliateLink).all()).toHaveLength(1)
  expect(await conn.select().from(publication).all()).toHaveLength(1)
})

it("never publishes the source affiliate link", async () => {
  const conn = await db()
  const result = await createPublication(valid, conn, DEFAULT_WORKSPACE_ID)

  expect(result.content).toContain("https://mercadolivre.com/sec/ours")
  expect(result.content).not.toContain(valid.sourceUrl)
})

it("rejects a publication without an affiliate link", async () => {
  await expect(
    createPublication(
      { ...valid, affiliateUrl: "" },
      await db(),
      DEFAULT_WORKSPACE_ID
    )
  ).rejects.toThrow(PublicationError)
})

it("rejects an affiliate link equal to the source link", async () => {
  await expect(
    createPublication(
      { ...valid, affiliateUrl: valid.sourceUrl },
      await db(),
      DEFAULT_WORKSPACE_ID
    )
  ).rejects.toThrow(PublicationError)
})

it("rejects image urls that could make the gateway fetch an internal host", async () => {
  await expect(
    createPublication(
      { ...valid, imageUrl: "http://127.0.0.1:3002/health" },
      await db(),
      DEFAULT_WORKSPACE_ID
    )
  ).rejects.toThrow(PublicationError)
})

it("reuses the same product across snapshots", async () => {
  const conn = await db()
  await createPublication(valid, conn, DEFAULT_WORKSPACE_ID)
  await createPublication(
    { ...valid, currentPrice: "279,90" },
    conn,
    DEFAULT_WORKSPACE_ID
  )

  expect(await conn.select().from(product).all()).toHaveLength(1)
  expect(await conn.select().from(dealSnapshot).all()).toHaveLength(2)
})

it("previews content without persisting", async () => {
  const conn = await db()
  const { content } = await previewPublication(
    valid,
    conn,
    DEFAULT_WORKSPACE_ID
  )

  expect(content).toContain("💰 *Por R$ 299,90*")
  expect(await conn.select().from(publication).all()).toHaveLength(0)
})
