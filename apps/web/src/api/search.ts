import type { TCategory } from "@sleightbook/shared/schemas/enums";
import type { IResolvedLibraryQuery } from "@sleightbook/shared/schemas/trick";

import type { ILocalDatabaseV2, ITrickRecord } from "../types/localDb.types";
import { routinesOfTrick } from "./assemble";

const CATEGORY_LABELS: Record<TCategory, string> = {
  card: "Card Magic",
  coin: "Coin Magic",
  mentalism: "Mentalism",
  gimmick: "Gimmick",
};

export const tokenize = (query: string): string[] =>
  query.toLowerCase().split(/\s+/).filter(Boolean);

const searchableText = (db: ILocalDatabaseV2, trick: ITrickRecord): string => {
  const routines = routinesOfTrick(db, trick.id);
  const phaseIds = new Set(routines.flatMap((routine) => routine.phases.map((phase) => phase.id)));
  const techniqueNames = routines
    .flatMap((routine) => routine.phases.flatMap((phase) => phase.techniqueIds))
    .map((id) => db.techniques.find((technique) => technique.id === id)?.name ?? "");
  const itemNames = routines
    .flatMap((routine) => routine.itemIds)
    .map((id) => db.items.find((item) => item.id === id)?.name ?? "");
  const noteBodies = db.notes
    .filter(
      (note) => note.trickId === trick.id || (note.phaseId !== null && phaseIds.has(note.phaseId)),
    )
    .map((note) => note.body);
  return [
    trick.name,
    trick.description,
    trick.category,
    CATEGORY_LABELS[trick.category],
    ...techniqueNames,
    ...itemNames,
    ...noteBodies,
  ]
    .join("\n")
    .toLowerCase();
};

export const matchesQuery = (
  db: ILocalDatabaseV2,
  trick: ITrickRecord,
  query: IResolvedLibraryQuery,
): boolean => {
  if (query.favoritesOnly && !trick.isFavorite) return false;
  if (query.category !== "all" && trick.category !== query.category) return false;
  const text = searchableText(db, trick);
  return tokenize(query.q).every((token) => text.includes(token));
};
