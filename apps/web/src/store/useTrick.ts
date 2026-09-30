import { create } from "zustand";

import type { INote } from "@sleightbook/shared/schemas/note";
import type { ITrickDetail, ITrickSummary } from "@sleightbook/shared/schemas/trick";

import { removeById, upsertById } from "../utils/list";

interface ITrickStore {
  tricks: ITrickSummary[];
  trick: ITrickDetail | null;
  isLoading: boolean;
  error: string | null;
  setTricks: (tricks: ITrickSummary[]) => void;
  setTrick: (trick: ITrickDetail | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setFavorite: (isFavorite: boolean) => void;
  upsertNote: (note: INote) => void;
  removeNote: (noteId: string) => void;
}

export const useTrickStore = create<ITrickStore>((set) => ({
  tricks: [],
  trick: null,
  isLoading: false,
  error: null,
  setTricks: (tricks) => set({ tricks }),
  setTrick: (trick) => set({ trick }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setFavorite: (isFavorite) =>
    set(({ trick }) => (trick ? { trick: { ...trick, isFavorite } } : {})),
  upsertNote: (note) =>
    set(({ trick }) =>
      trick && note.trickId === trick.id
        ? { trick: { ...trick, notes: upsertById(trick.notes, note) } }
        : {},
    ),
  removeNote: (noteId) =>
    set(({ trick }) =>
      trick ? { trick: { ...trick, notes: removeById(trick.notes, noteId) } } : {},
    ),
}));
