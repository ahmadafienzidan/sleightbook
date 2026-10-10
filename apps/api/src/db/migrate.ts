import { join } from "node:path";

import { migrate } from "drizzle-orm/pglite/migrator";

import { requireEnv } from "../env";
import { createDb, type TDb } from "./client";

export const MIGRATIONS_FOLDER = join(import.meta.dir, "migrations");

export const runMigrations = (db: TDb): Promise<void> =>
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

if (import.meta.main) {
  const db = createDb(requireEnv("DATA_DIR"));
  try {
    await runMigrations(db);
    console.log("Migrations applied");
  } finally {
    await db.$client.close();
  }
}
