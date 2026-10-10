import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { eq } from "drizzle-orm";

import { type ILibraryFixture, LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";
import type { ILibrarySnapshot } from "@sleightbook/shared/library/records";

import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import { notes, tricks, users } from "../src/db/schema";
import { seed } from "../src/db/seed";
import { loadSnapshot } from "../src/db/snapshot";
import { DEFAULT_USER_ID } from "../src/services/currentUser";
import { createTestDb } from "./helpers";

const db = await createTestDb();

afterAll(async () => {
  await db.$client.close();
});

// Row order inside id lists carries no meaning; compare as sets.
const normalize = (snapshot: ILibrarySnapshot): ILibrarySnapshot => {
  const byId = <T extends { id: string }>(rows: T[]): T[] =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return {
    tricks: byId(snapshot.tricks),
    routines: byId(snapshot.routines).map((routine) => ({
      ...routine,
      itemIds: [...routine.itemIds].sort(),
      phases: [...routine.phases]
        .sort((a, b) => a.position - b.position)
        .map((phase) => ({ ...phase, techniqueIds: [...phase.techniqueIds].sort() })),
    })),
    techniques: byId(snapshot.techniques),
    items: byId(snapshot.items),
    notes: byId(snapshot.notes),
  };
};

let seeded: ILibrarySnapshot;

beforeEach(async () => {
  seeded = await seed(db);
});

describe("seed + loadSnapshot", () => {
  test("loading returns exactly the snapshot that was seeded", async () => {
    expect(normalize(await loadSnapshot(db, DEFAULT_USER_ID))).toEqual(normalize(seeded));
  });

  test("seeding twice leaves one copy of the library", async () => {
    await seed(db);
    const snapshot = await loadSnapshot(db, DEFAULT_USER_ID);
    expect(snapshot.tricks).toHaveLength(6);
    expect(snapshot.routines).toHaveLength(8);
    expect(await db.select().from(users)).toHaveLength(1);
  });

  test("rejects a fixture whose visual routine is invalid", async () => {
    const [ambitious, ...rest] = LIBRARY_FIXTURE.tricks;
    // Dropping Preparation makes Standard start with doubleLift → NOT_SETUP.
    const broken: ILibraryFixture = {
      ...LIBRARY_FIXTURE,
      tricks: [
        {
          ...ambitious,
          routines: ambitious.routines.map((routine) =>
            routine.isDefault ? { ...routine, phases: routine.phases.slice(1) } : routine,
          ),
        },
        ...rest,
      ],
    };
    await expect(seed(db, broken)).rejects.toThrow("Invalid fixture routine Standard");
  });

  test("only the current user's rows are loaded", async () => {
    const otherUserId = "00000000-0000-4000-8000-000000000002";
    await db.insert(users).values({ id: otherUserId, name: "Someone else" });
    await db.insert(tricks).values({
      userId: otherUserId,
      name: "Foreign Trick",
      slug: "foreign-trick",
      category: "coin",
      difficulty: "beginner",
      durationMin: 1,
      durationMax: 2,
    });
    const names = (await loadSnapshot(db, DEFAULT_USER_ID)).tricks.map((trick) => trick.name);
    expect(names).not.toContain("Foreign Trick");
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  test("the database rejects a note with two targets", async () => {
    const [trick] = seeded.tricks;
    const [routine] = seeded.routines;
    const error = await db
      .insert(notes)
      .values({
        userId: DEFAULT_USER_ID,
        body: "two targets",
        trickId: trick?.id,
        routineId: routine?.id,
      })
      .execute()
      .then(
        () => null,
        (rejection: Error) => rejection,
      );
    // Drizzle wraps the Postgres error; the constraint name lives on the cause.
    expect((error?.cause as Error | undefined)?.message).toContain("notes_exactly_one_target");
  });
});

describe("file-backed database", () => {
  test("a file-backed database keeps data across reopen", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "sleightbook-api-"));
    try {
      const first = createDb(dataDir);
      await runMigrations(first);
      const written = await seed(first);
      const triumph = written.tricks.find((trick) => trick.slug === "triumph");
      await first
        .update(tricks)
        .set({ isFavorite: true })
        .where(eq(tricks.id, triumph?.id ?? ""));
      await first.$client.close();

      const second = createDb(dataDir);
      const reloaded = await loadSnapshot(second, DEFAULT_USER_ID);
      await second.$client.close();
      expect(reloaded.tricks).toHaveLength(6);
      expect(reloaded.tricks.find((trick) => trick.slug === "triumph")?.isFavorite).toBe(true);
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
