import { beforeEach, describe, expect, test } from "bun:test";

import type { INote } from "@sleightbook/shared/schemas/note";
import type { IPhase, IRoutineDetail } from "@sleightbook/shared/schemas/routine";

import { useRoutineStore } from "./useRoutine";

const PHASE_A = "00000000-0000-4000-8000-00000000000a";
const PHASE_B = "00000000-0000-4000-8000-00000000000b";

const makePhase = (id: string, position: number): IPhase => ({
  id,
  position,
  name: `Phase ${position}`,
  summary: "",
  explanation: "",
  spectatorText: "",
  actions: [],
  techniques: [],
  notes: [],
});

const makeNote = (id: string, phaseId: string): INote => ({
  id,
  body: `Note ${id}`,
  trickId: null,
  routineId: null,
  phaseId,
  techniqueId: null,
  itemId: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
});

const ROUTINE: IRoutineDetail = {
  id: "00000000-0000-4000-8000-000000000020",
  trickId: "00000000-0000-4000-8000-000000000010",
  name: "Standard",
  description: "",
  tips: [],
  items: [],
  phases: [makePhase(PHASE_A, 0), makePhase(PHASE_B, 1)],
};

describe("useRoutineStore", () => {
  beforeEach(() => {
    useRoutineStore.setState({ routine: ROUTINE, error: null });
  });

  test("upsertNote puts the note on its phase only", () => {
    useRoutineStore.getState().upsertNote(makeNote("n1", PHASE_B));
    const phases = useRoutineStore.getState().routine?.phases ?? [];
    expect(phases.map((phase) => phase.notes.length)).toEqual([0, 1]);
  });

  test("removeNote removes it from whichever phase holds it", () => {
    useRoutineStore.getState().upsertNote(makeNote("n1", PHASE_A));
    useRoutineStore.getState().removeNote("n1");
    expect(useRoutineStore.getState().routine?.phases[0]?.notes).toEqual([]);
  });
});
