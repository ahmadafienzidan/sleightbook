import { eq } from "drizzle-orm";

import { validateRoutine } from "@sleightbook/engine/timeline";
import { type ILibraryFixture, LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";
import { isVisualRoutineRecord } from "@sleightbook/shared/library/assemble";
import { buildLibrarySnapshot } from "@sleightbook/shared/library/buildSnapshot";
import type { ILibrarySnapshot } from "@sleightbook/shared/library/records";

import { requireEnv } from "../env";
import { DEFAULT_USER_ID } from "../services/currentUser";
import { createDb, type TDb } from "./client";
import { runMigrations } from "./migrate";
import { users } from "./schema";
import { writeSnapshot } from "./snapshot";

export const seed = async (
  db: TDb,
  fixture: ILibraryFixture = LIBRARY_FIXTURE,
): Promise<ILibrarySnapshot> => {
  const snapshot = buildLibrarySnapshot(
    fixture,
    () => crypto.randomUUID(),
    new Date().toISOString(),
  );
  for (const routine of snapshot.routines.filter(isVisualRoutineRecord)) {
    const validation = validateRoutine(routine.phases);
    if (!validation.ok) {
      throw new Error(
        `Invalid fixture routine ${routine.name}: ${validation.error.code} ${validation.error.message}`,
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.id, DEFAULT_USER_ID));
    await tx.insert(users).values({ id: DEFAULT_USER_ID, name: "Magician" });
    await writeSnapshot(tx, DEFAULT_USER_ID, snapshot);
  });
  return snapshot;
};

if (import.meta.main) {
  const db = createDb(requireEnv("DATA_DIR"));
  try {
    await runMigrations(db);
    await seed(db);
    console.log("Seed complete");
  } finally {
    await db.$client.close();
  }
}
