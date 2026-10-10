import { and, eq } from "drizzle-orm";

import type { ICreateNoteInput, INote } from "@sleightbook/shared/schemas/note";

import type { TDb } from "../db/client";
import { notes } from "../db/schema";
import { HttpError, notFound } from "../errors";
import { getCurrentUserId } from "./currentUser";
import { loadLibrary } from "./libraryService";

const toNoteDto = (row: typeof notes.$inferSelect): INote => ({
  id: row.id,
  body: row.body,
  trickId: row.trickId,
  routineId: row.routineId,
  phaseId: row.phaseId,
  techniqueId: row.techniqueId,
  itemId: row.itemId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const targetExists = async (db: TDb, input: ICreateNoteInput): Promise<boolean> => {
  const library = await loadLibrary(db);
  if (input.trickId) return library.tricks.some((trick) => trick.id === input.trickId);
  if (input.phaseId) {
    return library.routines.some((routine) =>
      routine.phases.some((phase) => phase.id === input.phaseId),
    );
  }
  if (input.techniqueId) {
    return library.techniques.some((technique) => technique.id === input.techniqueId);
  }
  if (input.itemId) return library.items.some((item) => item.id === input.itemId);
  return false;
};

export const createNote = async (db: TDb, input: ICreateNoteInput): Promise<INote> => {
  // Matches local mode: no DTO shows routine-level notes yet.
  if (input.routineId) {
    throw new HttpError(400, "NOT_SUPPORTED", "Routine notes are not supported");
  }
  if (!(await targetExists(db, input))) throw notFound("Note target");

  const [row] = await db
    .insert(notes)
    .values({
      userId: getCurrentUserId(),
      body: input.body,
      trickId: input.trickId ?? null,
      phaseId: input.phaseId ?? null,
      techniqueId: input.techniqueId ?? null,
      itemId: input.itemId ?? null,
    })
    .returning();
  return toNoteDto(row);
};

export const updateNote = async (db: TDb, id: string, body: string): Promise<INote> => {
  const [row] = await db
    .update(notes)
    .set({ body })
    .where(and(eq(notes.id, id), eq(notes.userId, getCurrentUserId())))
    .returning();
  if (!row) throw notFound("Note");
  return toNoteDto(row);
};

export const deleteNote = async (db: TDb, id: string): Promise<void> => {
  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, getCurrentUserId())))
    .returning({ id: notes.id });
  if (deleted.length === 0) throw notFound("Note");
};
