import { create } from "zustand";

import type { INote } from "@sleightbook/shared/schemas/note";
import type { IRoutineDetail } from "@sleightbook/shared/schemas/routine";

import { removeById, upsertById } from "../utils/list";

interface IRoutineStore {
  routine: IRoutineDetail | null;
  error: string | null;
  setRoutine: (routine: IRoutineDetail | null) => void;
  setError: (error: string | null) => void;
  upsertNote: (note: INote) => void;
  removeNote: (noteId: string) => void;
}

export const useRoutineStore = create<IRoutineStore>((set) => ({
  routine: null,
  error: null,
  setRoutine: (routine) => set({ routine }),
  setError: (error) => set({ error }),
  upsertNote: (note) =>
    set(({ routine }) => {
      if (!routine || !note.phaseId) return {};
      return {
        routine: {
          ...routine,
          phases: routine.phases.map((phase) =>
            phase.id === note.phaseId ? { ...phase, notes: upsertById(phase.notes, note) } : phase,
          ),
        },
      };
    }),
  removeNote: (noteId) =>
    set(({ routine }) =>
      routine
        ? {
            routine: {
              ...routine,
              phases: routine.phases.map((phase) => ({
                ...phase,
                notes: removeById(phase.notes, noteId),
              })),
            },
          }
        : {},
    ),
}));
