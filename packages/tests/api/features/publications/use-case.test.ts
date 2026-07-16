import { expect, it } from "vitest";
import {
  createPublication,
  previewPublication,
} from "@/features/publications/use-case";
import { createDb } from "@/shared/db";
import { PublicationError } from "@/shared/errors";
import {
  affiliateLink,
  dealSnapshot,
  product,
  publication,
} from "@/shared/schema";
import { DEFAULT_WORKSPACE_ID } from "@/shared/workspace";

function db() {
  return createDb(":memory:");
}

const valid = {
  title: "Air Fryer Mondial 5L",
  imageUrl: "https://http2.mlstatic.com/a.jpg",
  originalPrice: "499,90",
  currentPrice: "299,90",
  coupon: "CASA20",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours",
  externalId: "MLB123",
};

it("persists a publication and returns ready content", () => {
  const conn = db();
  const result = createPublication(valid, conn, DEFAULT_WORKSPACE_ID);

  expect(result.status).toBe("ready");
  expect(result.content).toContain("Air Fryer Mondial 5L");
  expect(result.content).toContain("R$ 299,90");

  expect(conn.select().from(product).all()).toHaveLength(1);
  expect(conn.select().from(dealSnapshot).all()).toHaveLength(1);
  expect(conn.select().from(affiliateLink).all()).toHaveLength(1);
  expect(conn.select().from(publication).all()).toHaveLength(1);
});

it("never publishes the source affiliate link", () => {
  const conn = db();
  const result = createPublication(valid, conn, DEFAULT_WORKSPACE_ID);

  expect(result.content).toContain("https://mercadolivre.com/sec/ours");
  expect(result.content).not.toContain(valid.sourceUrl);
});

it("rejects a publication without an affiliate link", () => {
  expect(() =>
    createPublication(
      { ...valid, affiliateUrl: "" },
      db(),
      DEFAULT_WORKSPACE_ID,
    ),
  ).toThrow(PublicationError);
});

it("rejects an affiliate link equal to the source link", () => {
  expect(() =>
    createPublication(
      { ...valid, affiliateUrl: valid.sourceUrl },
      db(),
      DEFAULT_WORKSPACE_ID,
    ),
  ).toThrow(PublicationError);
});

it("rejects image urls that could make the gateway fetch an internal host", () => {
  expect(() =>
    createPublication(
      { ...valid, imageUrl: "http://127.0.0.1:3002/health" },
      db(),
      DEFAULT_WORKSPACE_ID,
    ),
  ).toThrow(PublicationError);
});

it("reuses the same product across snapshots", () => {
  const conn = db();
  createPublication(valid, conn, DEFAULT_WORKSPACE_ID);
  createPublication(
    { ...valid, currentPrice: "279,90" },
    conn,
    DEFAULT_WORKSPACE_ID,
  );

  expect(conn.select().from(product).all()).toHaveLength(1);
  expect(conn.select().from(dealSnapshot).all()).toHaveLength(2);
});

it("previews content without persisting", () => {
  const conn = db();
  const { content } = previewPublication(valid, conn, DEFAULT_WORKSPACE_ID);

  expect(content).toContain("💰 *Por R$ 299,90*");
  expect(conn.select().from(publication).all()).toHaveLength(0);
});
