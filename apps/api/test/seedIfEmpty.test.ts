import { afterAll, describe, expect, test } from "bun:test";

import { notes } from "../src/db/schema";
import { seedIfEmpty } from "../src/db/seed";
import { loadSnapshot } from "../src/db/snapshot";
import { DEFAULT_USER_ID } from "../src/services/currentUser";
import { createTestDb } from "./helpers";

const db = await createTestDb();

afterAll(async () => {
  await db.$client.close();
});

describe("seedIfEmpty", () => {
  test("seeds a fresh database, then leaves existing data alone", async () => {
    expect(await seedIfEmpty(db)).toBe(true);
    const [trick] = (await loadSnapshot(db, DEFAULT_USER_ID)).tricks;
    await db.insert(notes).values({ userId: DEFAULT_USER_ID, body: "Mine", trickId: trick?.id });

    expect(await seedIfEmpty(db)).toBe(false);
    const snapshot = await loadSnapshot(db, DEFAULT_USER_ID);
    expect(snapshot.tricks).toHaveLength(6);
    expect(snapshot.notes.map((note) => note.body)).toContain("Mine");
  });
});
