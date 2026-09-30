import type { ILocalDatabaseV1, ILocalDatabaseV2 } from "../types/localDb.types";
import { defaultRoutineOf } from "./assemble";

// Carries MVP1 user data (favorite + notes of Ambitious Card) into a freshly seeded v2 store.
export const migrateV1 = (
  v1: ILocalDatabaseV1,
  v2: ILocalDatabaseV2,
  newId: () => string,
): void => {
  for (const oldTrick of v1.tricks) {
    const trick = v2.tricks.find((candidate) => candidate.slug === oldTrick.slug);
    if (!trick) continue;
    trick.isFavorite = oldTrick.isFavorite;

    const existingBodies = new Set(
      v2.notes.filter((note) => note.trickId === trick.id).map((note) => note.body),
    );
    for (const note of oldTrick.notes) {
      if (existingBodies.has(note.body)) continue;
      v2.notes.push({ ...note, id: newId(), trickId: trick.id, phaseId: null });
    }

    const oldRoutine = v1.routines.find((routine) => routine.id === oldTrick.defaultRoutineId);
    const newRoutine = defaultRoutineOf(v2, trick.id);
    if (!oldRoutine || !newRoutine) continue;
    for (const oldPhase of oldRoutine.phases) {
      const phase = newRoutine.phases.find((candidate) => candidate.position === oldPhase.position);
      if (!phase) continue;
      for (const note of oldPhase.notes) {
        v2.notes.push({ ...note, id: newId(), trickId: null, phaseId: phase.id });
      }
    }
  }
};
