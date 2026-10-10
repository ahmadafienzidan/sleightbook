import { and, eq } from "drizzle-orm";

import {
  toItemDetail,
  toItemSummary,
  toRoutineDetail,
  toTechniqueDetail,
  toTechniqueSummary,
  toTrickCard,
  toTrickDetail,
  toTrickSummary,
} from "@sleightbook/shared/library/assemble";
import type { ILibrarySnapshot } from "@sleightbook/shared/library/records";
import { matchesQuery } from "@sleightbook/shared/library/search";
import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import type { IRoutineDetail } from "@sleightbook/shared/schemas/routine";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";
import type {
  IResolvedLibraryQuery,
  ITrickCard,
  ITrickDetail,
  ITrickSummary,
} from "@sleightbook/shared/schemas/trick";

import type { TDb } from "../db/client";
import { tricks } from "../db/schema";
import { loadSnapshot } from "../db/snapshot";
import { notFound } from "../errors";
import { getCurrentUserId } from "./currentUser";

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

export const loadLibrary = (db: TDb): Promise<ILibrarySnapshot> =>
  loadSnapshot(db, getCurrentUserId());

const findById = <T extends { id: string }>(rows: T[], id: string, entity: string): T => {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) throw notFound(entity);
  return row;
};

export const listTricks = async (db: TDb): Promise<ITrickSummary[]> =>
  (await loadLibrary(db)).tricks.map(toTrickSummary).sort(byName);

export const searchTricks = async (
  db: TDb,
  query: IResolvedLibraryQuery,
): Promise<ITrickCard[]> => {
  const library = await loadLibrary(db);
  return library.tricks
    .filter((trick) => matchesQuery(library, trick, query))
    .map((trick) => toTrickCard(library, trick))
    .sort(byName);
};

export const getTrick = async (db: TDb, id: string): Promise<ITrickDetail> => {
  const library = await loadLibrary(db);
  return toTrickDetail(library, findById(library.tricks, id, "Trick"));
};

export const getRoutine = async (db: TDb, id: string): Promise<IRoutineDetail> => {
  const library = await loadLibrary(db);
  return toRoutineDetail(library, findById(library.routines, id, "Routine"));
};

export const listTechniques = async (db: TDb): Promise<ITechniqueSummary[]> => {
  const library = await loadLibrary(db);
  return library.techniques.map((technique) => toTechniqueSummary(library, technique)).sort(byName);
};

export const getTechnique = async (db: TDb, id: string): Promise<ITechniqueDetail> => {
  const library = await loadLibrary(db);
  return toTechniqueDetail(library, findById(library.techniques, id, "Technique"));
};

export const listItems = async (db: TDb): Promise<IItemSummary[]> => {
  const library = await loadLibrary(db);
  return library.items.map((item) => toItemSummary(library, item)).sort(byName);
};

export const getItem = async (db: TDb, id: string): Promise<IItemDetail> => {
  const library = await loadLibrary(db);
  return toItemDetail(library, findById(library.items, id, "Item"));
};

export const setFavorite = async (
  db: TDb,
  id: string,
  isFavorite: boolean,
): Promise<ITrickDetail> => {
  const updated = await db
    .update(tricks)
    .set({ isFavorite })
    .where(and(eq(tricks.id, id), eq(tricks.userId, getCurrentUserId())))
    .returning({ id: tricks.id });
  if (updated.length === 0) throw notFound("Trick");
  return getTrick(db, id);
};
