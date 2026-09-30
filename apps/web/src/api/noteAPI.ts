import type { ICreateNoteInput } from "@sleightbook/shared/schemas/note";

import { localDb } from "./localDb";

export const postNote = async (input: ICreateNoteInput) => localDb.createNote(input);

export const patchNote = async (id: string, body: string) => localDb.updateNote(id, body);

export const deleteNote = async (id: string) => localDb.deleteNote(id);
