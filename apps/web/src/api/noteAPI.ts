import type { ICreateNoteInput } from "@sleightbook/shared/schemas/note";

import { dataSource } from "./dataSource";

export const postNote = async (input: ICreateNoteInput) => dataSource.createNote(input);

export const patchNote = async (id: string, body: string) => dataSource.updateNote(id, body);

export const deleteNote = async (id: string) => dataSource.deleteNote(id);
