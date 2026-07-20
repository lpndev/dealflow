import { chmodSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { createClient, type Client } from "@libsql/client"
import { eq } from "drizzle-orm"
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql"
import { migrate as runMigrations } from "drizzle-orm/libsql/migrator"
import * as schema from "./schema"
import { organization } from "./schema"

export type Db = LibSQLDatabase<typeof schema> & {
  $client: Client
  $url: string
}

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

function localPath(url: string): string | undefined {
  const path = url.startsWith("file:") ? url.slice("file:".length) : url
  if (path === "" || path.startsWith(":memory:")) return undefined
  if (url === path && url.includes("://")) return undefined
  return path
}

export function libsqlUrl(url: string): string {
  const path = localPath(url)
  return path === undefined || url.startsWith("file:") ? url : `file:${path}`
}

export function createDb(url: string): Db {
  if (localPath(url)) process.umask(0o077)
  const client = createClient({ url: libsqlUrl(url) })
  return Object.assign(drizzle(client, { schema }), { $url: url })
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

export async function migrateDb(db: Db): Promise<void> {
  await db.$client.execute("PRAGMA foreign_keys = ON;")
  await runMigrations(db, { migrationsFolder })
  const path = localPath(db.$url)
  if (path) chmodSync(path, 0o600)
  await seedLegacyWorkspace(db)
}

let appDb: Db | undefined

export function getDb(): Db {
  appDb ??= createDb(resolveDatabaseUrl())
  return appDb
}
