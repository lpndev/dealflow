import { createDb, migrateDb, type Db } from "@/shared/db"

export async function testDb(): Promise<Db> {
  const db = createDb(":memory:")
  await migrateDb(db)
  return db
}
