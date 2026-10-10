import { afterAll, describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";

import { createTestDb } from "./helpers";

const db = await createTestDb();

afterAll(async () => {
  await db.$client.close();
});

describe("database schema", () => {
  test("migrations create every table", async () => {
    const result = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual([
      "actions",
      "items",
      "notes",
      "phase_techniques",
      "phases",
      "routine_items",
      "routines",
      "techniques",
      "tricks",
      "users",
    ]);
  });
});
