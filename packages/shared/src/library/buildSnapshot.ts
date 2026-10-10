import type { ILibraryFixture } from "../fixtures/library";
import type { INote } from "../schemas/note";
import type { ILibrarySnapshot, IRoutineRecord, ITrickRecord } from "./records";

const idFor = (ids: Map<string, string>, name: string, kind: string): string => {
  const id = ids.get(name);
  if (!id) throw new Error(`Unknown ${kind} in fixture: ${name}`);
  return id;
};

export const buildLibrarySnapshot = (
  fixture: ILibraryFixture,
  newId: () => string,
  now: string,
): ILibrarySnapshot => {
  const techniques = fixture.techniques.map((technique) => ({ id: newId(), ...technique }));
  const items = fixture.items.map((item) => ({ id: newId(), ...item }));
  const techniqueIds = new Map(techniques.map((technique) => [technique.name, technique.id]));
  const itemIds = new Map(items.map((item) => [item.name, item.id]));

  const tricks: ITrickRecord[] = [];
  const routines: IRoutineRecord[] = [];
  const notes: INote[] = [];

  for (const entry of fixture.tricks) {
    const trickId = newId();
    tricks.push({ id: trickId, ...entry.trick, isFavorite: false });
    entry.routines.forEach((routine, position) => {
      routines.push({
        id: newId(),
        trickId,
        name: routine.name,
        description: routine.description,
        tips: [...routine.tips],
        isDefault: routine.isDefault,
        position,
        itemIds: routine.items.map((name) => idFor(itemIds, name, "item")),
        phases: routine.phases.map((phase, phasePosition) => ({
          id: newId(),
          position: phasePosition,
          name: phase.name,
          summary: phase.summary,
          explanation: phase.explanation,
          spectatorText: phase.spectatorText,
          actions: phase.actions.map((record, actionPosition) => ({
            id: newId(),
            position: actionPosition,
            durationMs: record.durationMs,
            action: record.action,
          })),
          techniqueIds: phase.techniques.map((name) => idFor(techniqueIds, name, "technique")),
        })),
      });
    });
    if (entry.note) {
      notes.push({
        id: newId(),
        body: entry.note,
        trickId,
        routineId: null,
        phaseId: null,
        techniqueId: null,
        itemId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return { tricks, routines, techniques, items, notes };
};
