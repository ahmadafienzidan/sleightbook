import { describe, expect, test } from "bun:test";

import { LIBRARY_FIXTURE } from "../fixtures/library";
import { defaultRoutineOf, isVisualRoutineRecord } from "./assemble";
import { buildLibrarySnapshot } from "./buildSnapshot";
import { LibrarySnapshotSchema } from "./records";

const NOW = "2026-09-26T00:00:00.000Z";

const makeIdFactory = () => {
  let counter = 0;
  return () => {
    counter += 1;
    return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
  };
};

describe("buildLibrarySnapshot", () => {
  const snapshot = buildLibrarySnapshot(LIBRARY_FIXTURE, makeIdFactory(), NOW);
  const phases = snapshot.routines.flatMap((routine) => routine.phases);

  test("builds a valid snapshot of the whole library", () => {
    expect(LibrarySnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect({
      tricks: snapshot.tricks.length,
      routines: snapshot.routines.length,
      phases: phases.length,
      actions: phases.flatMap((phase) => phase.actions).length,
      techniques: snapshot.techniques.length,
      items: snapshot.items.length,
      notes: snapshot.notes.length,
    }).toEqual({
      tricks: 6,
      routines: 8,
      phases: 29,
      actions: 17,
      techniques: 12,
      items: 6,
      notes: 1,
    });
  });

  test("only Standard and Vernon are visual routines", () => {
    expect(snapshot.routines.filter(isVisualRoutineRecord).map((routine) => routine.name)).toEqual([
      "Standard",
      "Vernon",
    ]);
  });

  test("every trick resolves its default routine", () => {
    for (const trick of snapshot.tricks) {
      expect(defaultRoutineOf(snapshot, trick.id)?.isDefault).toBe(true);
    }
  });
});
