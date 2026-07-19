import { chmodSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate as runMigrations } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";
import { organization } from "./schema";

export type Db = BunSQLiteDatabase<typeof schema>;

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url),
);
const defaultDatabaseUrl = fileURLToPath(
  new URL("../../dealflow.db", import.meta.url),
);

export function resolveDatabaseUrl(
  env: { DATABASE_URL?: string; NODE_ENV?: string } = process.env,
): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  return env.NODE_ENV === "test" ? ":memory:" : defaultDatabaseUrl;
}

function seedLegacyWorkspace(db: Db) {
  const existing = db
    .select()
    .from(organization)
    .where(eq(organization.id, "default"))
    .get();
  if (existing) return;
  db.insert(organization)
    .values({
      id: "default",
      name: "Workspace",
      slug: "default",
      createdAt: new Date(),
    })
    .run();
}

export function createDb(url: string): Db {
  process.umask(0o077);
  const sqlite = new Database(url);
  if (url !== ":memory:") chmodSync(url, 0o600);
  sqlite.run("PRAGMA foreign_keys = ON;");
  const db = drizzle(sqlite, { schema });
  runMigrations(db, { migrationsFolder });
  seedLegacyWorkspace(db);
  return db;
}

let appDb: Db | undefined;

export function getDb(): Db {
  appDb ??= createDb(resolveDatabaseUrl());
  return appDb;
}
