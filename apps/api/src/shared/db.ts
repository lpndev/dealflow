import { fileURLToPath } from "node:url";
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate as runMigrations } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema";

export type Db = BunSQLiteDatabase<typeof schema>;

const migrationsFolder = fileURLToPath(new URL("../../drizzle", import.meta.url));

export function createDb(url: string): Db {
  const sqlite = new Database(url);
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const db = drizzle(sqlite, { schema });
  runMigrations(db, { migrationsFolder });
  return db;
}

let appDb: Db | undefined;

export function getDb(): Db {
  appDb ??= createDb(process.env.DATABASE_URL ?? "dealflow.db");
  return appDb;
}
