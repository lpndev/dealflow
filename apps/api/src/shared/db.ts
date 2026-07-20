import { chmodSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createClient, type Client } from "@libsql/client"
import { eq } from "drizzle-orm"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import { migrate as runMigrations } from "drizzle-orm/libsql/migrator"
import * as schema from "./schema"
import { organization } from "./schema"

export type Db = LibSQLDatabase<typeof schema> & { $client: Client }

const migrationsFolder = fileURLToPath(
  new URL("../../drizzle", import.meta.url)
)
const defaultDatabaseUrl = fileURLToPath(
  new URL("../../dealflow.db", import.meta.url)
)

export function resolveDatabaseUrl(
  env: { DATABASE_URL?: string; NODE_ENV?: string } = process.env
): string {
  if (env.DATABASE_URL) return env.DATABASE_URL
  return env.NODE_ENV === "test" ? ":memory:" : defaultDatabaseUrl
}

function isLocalFile(url: string): boolean {
  return url !== ":memory:" && !url.includes("://")
}

function libsqlUrl(url: string): string {
  return isLocalFile(url) ? `file:${url}` : url
}

export function createDb(url: string): Db {
  if (isLocalFile(url)) process.umask(0o077)
  const client = createClient({ url: libsqlUrl(url) })
  return drizzle(client, { schema })
}

async function seedLegacyWorkspace(db: Db): Promise<void> {
  const existing = await db
    .select()
    .from(organization)
    .where(eq(organization.id, "default"))
    .get()
  if (existing) return
  await db
    .insert(organization)
    .values({
      id: "default",
      name: "Workspace",
      slug: "default",
      createdAt: new Date()
    })
    .run()
}

export async function migrateDb(
  db: Db,
  url: string = resolveDatabaseUrl()
): Promise<void> {
  await db.$client.execute("PRAGMA foreign_keys = ON;")
  await runMigrations(db, { migrationsFolder })
  if (isLocalFile(url)) chmodSync(url, 0o600)
  await seedLegacyWorkspace(db)
}

let appDb: Db | undefined

export function getDb(): Db {
  appDb ??= createDb(resolveDatabaseUrl())
  return appDb
}
