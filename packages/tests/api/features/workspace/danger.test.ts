import { getTableColumns, getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { expect, it } from "vitest";
import { createPublication } from "@/features/publications/use-case";
import {
  deleteWorkspaceData,
  WORKSPACE_TABLES,
} from "@/features/workspace/danger/use-case";
import { createDb } from "@/shared/db";
import * as schema from "@/shared/schema";
import { product, publication } from "@/shared/schema";

const deal = {
  title: "Air Fryer",
  imageUrl: "https://http2.mlstatic.com/a.jpg",
  currentPrice: "299,90",
  sourceUrl: "https://www.mercadolivre.com.br/air-fryer/p/MLB123",
  affiliateUrl: "https://mercadolivre.com/sec/ours",
};

it("deletes only the target workspace's domain rows", () => {
  const db = createDb(":memory:");
  createPublication(deal, db, "ws-a");
  createPublication(deal, db, "ws-b");

  deleteWorkspaceData(db, "ws-a");

  expect(
    db
      .select()
      .from(publication)
      .all()
      .map((p) => p.workspaceId),
  ).toEqual(["ws-b"]);
  expect(
    db
      .select()
      .from(product)
      .all()
      .map((p) => p.workspaceId),
  ).toEqual(["ws-b"]);
});

it("cascade covers every workspace-scoped table in the schema", () => {
  const scoped: string[] = (Object.values(schema) as unknown[])
    .filter((value): value is SQLiteTable => is(value, SQLiteTable))
    .filter((table) => "workspaceId" in getTableColumns(table))
    .map((table) => getTableName(table))
    .sort();
  const covered: string[] = WORKSPACE_TABLES.map((table) =>
    getTableName(table),
  );

  expect(covered.sort()).toEqual(scoped);
});
