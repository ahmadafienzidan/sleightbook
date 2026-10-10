import { asc, eq, getTableColumns } from "drizzle-orm";

import type { ILibrarySnapshot, IRoutineRecord } from "@sleightbook/shared/library/records";
import { ActionSchema } from "@sleightbook/shared/schemas/action";
import type { IActionRecord } from "@sleightbook/shared/schemas/routine";

import type { TDb, TTx } from "./client";
import {
  actions,
  items,
  notes,
  phaseTechniques,
  phases,
  routineItems,
  routines,
  techniques,
  tricks,
} from "./schema";

export const writeSnapshot = async (
  tx: TTx,
  userId: string,
  snapshot: ILibrarySnapshot,
): Promise<void> => {
  const phaseRows = snapshot.routines.flatMap((routine) =>
    routine.phases.map((phase) => ({ routineId: routine.id, phase })),
  );
  const actionRows = phaseRows.flatMap(({ phase }) =>
    phase.actions.map((record) => ({
      id: record.id,
      phaseId: phase.id,
      position: record.position,
      type: record.action.type,
      params: record.action.params,
      durationMs: record.durationMs,
    })),
  );
  const phaseTechniqueRows = phaseRows.flatMap(({ phase }) =>
    phase.techniqueIds.map((techniqueId) => ({ phaseId: phase.id, techniqueId })),
  );
  const routineItemRows = snapshot.routines.flatMap((routine) =>
    routine.itemIds.map((itemId) => ({ routineId: routine.id, itemId })),
  );

  if (snapshot.techniques.length > 0) {
    await tx
      .insert(techniques)
      .values(snapshot.techniques.map((technique) => ({ userId, ...technique })));
  }
  if (snapshot.items.length > 0) {
    await tx.insert(items).values(snapshot.items.map((item) => ({ userId, ...item })));
  }
  if (snapshot.tricks.length > 0) {
    await tx.insert(tricks).values(snapshot.tricks.map((trick) => ({ userId, ...trick })));
  }
  if (snapshot.routines.length > 0) {
    await tx.insert(routines).values(
      snapshot.routines.map((routine) => ({
        id: routine.id,
        trickId: routine.trickId,
        name: routine.name,
        description: routine.description,
        tips: routine.tips,
        isDefault: routine.isDefault,
        position: routine.position,
      })),
    );
  }
  if (phaseRows.length > 0) {
    await tx.insert(phases).values(
      phaseRows.map(({ routineId, phase }) => ({
        id: phase.id,
        routineId,
        position: phase.position,
        name: phase.name,
        summary: phase.summary,
        explanation: phase.explanation,
        spectatorText: phase.spectatorText,
      })),
    );
  }
  if (actionRows.length > 0) await tx.insert(actions).values(actionRows);
  if (phaseTechniqueRows.length > 0) await tx.insert(phaseTechniques).values(phaseTechniqueRows);
  if (routineItemRows.length > 0) await tx.insert(routineItems).values(routineItemRows);
  if (snapshot.notes.length > 0) {
    await tx.insert(notes).values(
      snapshot.notes.map((note) => ({
        ...note,
        userId,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      })),
    );
  }
};

const groupBy = <T, K>(rows: T[], keyOf: (row: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
};

export const loadSnapshot = async (db: TDb, userId: string): Promise<ILibrarySnapshot> => {
  const ownTricks = eq(tricks.userId, userId);
  const [
    trickRows,
    routineRows,
    phaseRows,
    actionRows,
    phaseTechniqueRows,
    routineItemRows,
    techniqueRows,
    itemRows,
    noteRows,
  ] = await Promise.all([
    db.select().from(tricks).where(ownTricks).orderBy(asc(tricks.name)),
    db
      .select(getTableColumns(routines))
      .from(routines)
      .innerJoin(tricks, eq(routines.trickId, tricks.id))
      .where(ownTricks)
      .orderBy(asc(routines.position)),
    db
      .select(getTableColumns(phases))
      .from(phases)
      .innerJoin(routines, eq(phases.routineId, routines.id))
      .innerJoin(tricks, eq(routines.trickId, tricks.id))
      .where(ownTricks)
      .orderBy(asc(phases.position)),
    db
      .select(getTableColumns(actions))
      .from(actions)
      .innerJoin(phases, eq(actions.phaseId, phases.id))
      .innerJoin(routines, eq(phases.routineId, routines.id))
      .innerJoin(tricks, eq(routines.trickId, tricks.id))
      .where(ownTricks)
      .orderBy(asc(actions.position)),
    db
      .select(getTableColumns(phaseTechniques))
      .from(phaseTechniques)
      .innerJoin(techniques, eq(phaseTechniques.techniqueId, techniques.id))
      .where(eq(techniques.userId, userId)),
    db
      .select(getTableColumns(routineItems))
      .from(routineItems)
      .innerJoin(items, eq(routineItems.itemId, items.id))
      .where(eq(items.userId, userId)),
    db.select().from(techniques).where(eq(techniques.userId, userId)).orderBy(asc(techniques.name)),
    db.select().from(items).where(eq(items.userId, userId)).orderBy(asc(items.name)),
    db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(asc(notes.createdAt), asc(notes.id)),
  ]);

  const actionsByPhase = groupBy(actionRows, (row) => row.phaseId);
  const techniquesByPhase = groupBy(phaseTechniqueRows, (row) => row.phaseId);
  const itemsByRoutine = groupBy(routineItemRows, (row) => row.routineId);
  const phasesByRoutine = groupBy(phaseRows, (row) => row.routineId);

  const toActionRecord = (row: (typeof actionRows)[number]): IActionRecord => ({
    id: row.id,
    position: row.position,
    durationMs: row.durationMs,
    action: ActionSchema.parse({ type: row.type, params: row.params }),
  });

  const routineRecords: IRoutineRecord[] = routineRows.map((routine) => ({
    id: routine.id,
    trickId: routine.trickId,
    name: routine.name,
    description: routine.description,
    tips: routine.tips,
    isDefault: routine.isDefault,
    position: routine.position,
    itemIds: (itemsByRoutine.get(routine.id) ?? []).map((row) => row.itemId),
    phases: (phasesByRoutine.get(routine.id) ?? []).map((phase) => ({
      id: phase.id,
      position: phase.position,
      name: phase.name,
      summary: phase.summary,
      explanation: phase.explanation,
      spectatorText: phase.spectatorText,
      actions: (actionsByPhase.get(phase.id) ?? []).map(toActionRecord),
      techniqueIds: (techniquesByPhase.get(phase.id) ?? []).map((row) => row.techniqueId),
    })),
  }));

  return {
    tricks: trickRows.map((trick) => ({
      id: trick.id,
      name: trick.name,
      slug: trick.slug,
      category: trick.category,
      difficulty: trick.difficulty,
      isFavorite: trick.isFavorite,
      description: trick.description,
      durationMin: trick.durationMin,
      durationMax: trick.durationMax,
    })),
    routines: routineRecords,
    techniques: techniqueRows.map((technique) => ({
      id: technique.id,
      name: technique.name,
      description: technique.description,
      difficulty: technique.difficulty,
      category: technique.category,
      tips: technique.tips,
      commonMistakes: technique.commonMistakes,
    })),
    items: itemRows.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      description: item.description,
      setupNotes: item.setupNotes,
    })),
    notes: noteRows.map((note) => ({
      id: note.id,
      body: note.body,
      trickId: note.trickId,
      routineId: note.routineId,
      phaseId: note.phaseId,
      techniqueId: note.techniqueId,
      itemId: note.itemId,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
  };
};
