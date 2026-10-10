import { createDb, type TDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

export const MISSING_ID = "00000000-0000-4000-8000-00000000ffff";

export const createTestDb = async (): Promise<TDb> => {
  const db = createDb();
  await runMigrations(db);
  return db;
};

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
