import { beforeEach, describe, expect, test } from "bun:test";

import type { INote } from "@sleightbook/shared/schemas/note";
import type { ITrickDetail } from "@sleightbook/shared/schemas/trick";

import { useTrickStore } from "./useTrick";

const TRICK_ID = "00000000-0000-4000-8000-000000000010";

const makeNote = (id: string, body: string, trickId: string | null): INote => ({
  id,
  body,
  trickId,
  routineId: null,
  phaseId: trickId ? null : "00000000-0000-4000-8000-000000000099",
  techniqueId: null,
  itemId: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
});

const TRICK: ITrickDetail = {
  id: TRICK_ID,
  name: "Ambitious Card",
  slug: "ambitious-card",
  category: "card",
  difficulty: "intermediate",
  isFavorite: false,
  description: "",
  durationMin: 5,
  durationMax: 8,
  items: [],
  routines: [],
  defaultRoutineId: null,
  notes: [makeNote("n1", "First", TRICK_ID)],
};

describe("useTrickStore", () => {
  beforeEach(() => {
    useTrickStore.setState({ trick: TRICK, tricks: [], isLoading: false, error: null });
  });

  test("upsertNote adds and replaces trick notes", () => {
    useTrickStore.getState().upsertNote(makeNote("n2", "Second", TRICK_ID));
    useTrickStore.getState().upsertNote(makeNote("n1", "Edited", TRICK_ID));
    expect(useTrickStore.getState().trick?.notes.map((note) => note.body)).toEqual([
      "Edited",
      "Second",
    ]);
  });

  test("upsertNote ignores notes for other targets", () => {
    useTrickStore.getState().upsertNote(makeNote("n3", "Phase note", null));
    expect(useTrickStore.getState().trick?.notes).toHaveLength(1);
  });

  test("removeNote and setFavorite", () => {
    useTrickStore.getState().removeNote("n1");
    useTrickStore.getState().setFavorite(true);
    expect(useTrickStore.getState().trick).toMatchObject({ notes: [], isFavorite: true });
  });
});
