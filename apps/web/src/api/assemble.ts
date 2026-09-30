import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import type { INote } from "@sleightbook/shared/schemas/note";
import type { IRoutineDetail, ITechnique } from "@sleightbook/shared/schemas/routine";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";
import type {
  IItem,
  ITrickCard,
  ITrickDetail,
  ITrickSummary,
} from "@sleightbook/shared/schemas/trick";
import type { IUsage } from "@sleightbook/shared/schemas/usage";

import type { ILocalDatabaseV2, IRoutineRecord, ITrickRecord } from "../types/localDb.types";

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);
const byCreated = (a: INote, b: INote): number =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export const isVisualRoutineRecord = (routine: IRoutineRecord): boolean =>
  routine.phases.length > 0 && routine.phases.every((phase) => phase.actions.length > 0);

export const routinesOfTrick = (db: ILocalDatabaseV2, trickId: string): IRoutineRecord[] =>
  db.routines
    .filter((routine) => routine.trickId === trickId)
    .sort((a, b) => a.position - b.position);

export const defaultRoutineOf = (db: ILocalDatabaseV2, trickId: string): IRoutineRecord | null => {
  const routines = routinesOfTrick(db, trickId);
  return routines.find((routine) => routine.isDefault) ?? routines.at(0) ?? null;
};

const techniqueOf = (db: ILocalDatabaseV2, id: string): ITechnique => {
  const technique = db.techniques.find((candidate) => candidate.id === id);
  if (!technique) throw new Error(`Missing technique ${id}`);
  return technique;
};

const itemOf = (db: ILocalDatabaseV2, id: string): IItem => {
  const item = db.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing item ${id}`);
  return item;
};

export const toTrickSummary = (trick: ITrickRecord): ITrickSummary => ({
  id: trick.id,
  name: trick.name,
  slug: trick.slug,
  category: trick.category,
  difficulty: trick.difficulty,
  isFavorite: trick.isFavorite,
});

export const toTrickCard = (db: ILocalDatabaseV2, trick: ITrickRecord): ITrickCard => {
  const routine = defaultRoutineOf(db, trick.id);
  const techniqueNames = routine
    ? [...new Set(routine.phases.flatMap((phase) => phase.techniqueIds))]
        .map((id) => techniqueOf(db, id).name)
        .sort((a, b) => a.localeCompare(b))
    : [];
  return {
    ...toTrickSummary(trick),
    description: trick.description,
    durationMin: trick.durationMin,
    durationMax: trick.durationMax,
    phaseCount: routine?.phases.length ?? 0,
    techniqueNames,
    hasVisualization: routine ? isVisualRoutineRecord(routine) : false,
  };
};

export const toTrickDetail = (db: ILocalDatabaseV2, trick: ITrickRecord): ITrickDetail => {
  const defaultRoutine = defaultRoutineOf(db, trick.id);
  return {
    ...toTrickSummary(trick),
    description: trick.description,
    durationMin: trick.durationMin,
    durationMax: trick.durationMax,
    items: defaultRoutine ? defaultRoutine.itemIds.map((id) => itemOf(db, id)).sort(byName) : [],
    routines: routinesOfTrick(db, trick.id).map((routine) => ({
      id: routine.id,
      name: routine.name,
      isDefault: routine.isDefault,
      position: routine.position,
      hasVisualization: isVisualRoutineRecord(routine),
    })),
    defaultRoutineId: defaultRoutine?.id ?? null,
    notes: db.notes.filter((note) => note.trickId === trick.id).sort(byCreated),
  };
};

export const toRoutineDetail = (db: ILocalDatabaseV2, routine: IRoutineRecord): IRoutineDetail => ({
  id: routine.id,
  trickId: routine.trickId,
  name: routine.name,
  description: routine.description,
  tips: [...routine.tips],
  items: routine.itemIds.map((id) => itemOf(db, id)).sort(byName),
  phases: [...routine.phases]
    .sort((a, b) => a.position - b.position)
    .map((phase) => ({
      id: phase.id,
      position: phase.position,
      name: phase.name,
      summary: phase.summary,
      explanation: phase.explanation,
      spectatorText: phase.spectatorText,
      actions: phase.actions,
      techniques: phase.techniqueIds.map((id) => techniqueOf(db, id)).sort(byName),
      notes: db.notes.filter((note) => note.phaseId === phase.id).sort(byCreated),
    })),
});

const collectUsages = (
  db: ILocalDatabaseV2,
  phaseNamesFor: (routine: IRoutineRecord) => string[] | null,
): IUsage[] => {
  const rows: { usage: IUsage; position: number }[] = [];
  for (const routine of db.routines) {
    const phaseNames = phaseNamesFor(routine);
    const trick = db.tricks.find((candidate) => candidate.id === routine.trickId);
    if (phaseNames === null || !trick) continue;
    rows.push({
      usage: {
        trickId: trick.id,
        trickName: trick.name,
        routineId: routine.id,
        routineName: routine.name,
        phaseNames,
      },
      position: routine.position,
    });
  }
  return rows
    .sort((a, b) => a.usage.trickName.localeCompare(b.usage.trickName) || a.position - b.position)
    .map((row) => row.usage);
};

export const techniqueUsages = (db: ILocalDatabaseV2, techniqueId: string): IUsage[] =>
  collectUsages(db, (routine) => {
    const names = [...routine.phases]
      .sort((a, b) => a.position - b.position)
      .filter((phase) => phase.techniqueIds.includes(techniqueId))
      .map((phase) => phase.name);
    return names.length > 0 ? names : null;
  });

export const itemUsages = (db: ILocalDatabaseV2, itemId: string): IUsage[] =>
  collectUsages(db, (routine) => (routine.itemIds.includes(itemId) ? [] : null));

export const toTechniqueSummary = (
  db: ILocalDatabaseV2,
  technique: ITechnique,
): ITechniqueSummary => ({
  id: technique.id,
  name: technique.name,
  category: technique.category,
  difficulty: technique.difficulty,
  usageCount: techniqueUsages(db, technique.id).length,
});

export const toTechniqueDetail = (
  db: ILocalDatabaseV2,
  technique: ITechnique,
): ITechniqueDetail => ({
  ...technique,
  usedIn: techniqueUsages(db, technique.id),
  notes: db.notes.filter((note) => note.techniqueId === technique.id).sort(byCreated),
});

export const toItemSummary = (db: ILocalDatabaseV2, item: IItem): IItemSummary => ({
  ...item,
  usageCount: itemUsages(db, item.id).length,
});

export const toItemDetail = (db: ILocalDatabaseV2, item: IItem): IItemDetail => ({
  ...item,
  usedIn: itemUsages(db, item.id),
  notes: db.notes.filter((note) => note.itemId === item.id).sort(byCreated),
});
