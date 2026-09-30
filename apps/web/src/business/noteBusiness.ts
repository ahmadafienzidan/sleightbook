import type { ICreateNoteInput, INote } from "@sleightbook/shared/schemas/note";

import { deleteNote, patchNote, postNote } from "../api/noteAPI";
import { i18n } from "../i18n/i18n";
import { useRoutineStore } from "../store/useRoutine";
import { useTrickStore } from "../store/useTrick";
import { Toast } from "../utils/toast";
import { handleError } from "./errorHandler";

const applyNote = (note: INote): void => {
  useTrickStore.getState().upsertNote(note);
  useRoutineStore.getState().upsertNote(note);
};

export const doCreateNote = async (input: ICreateNoteInput): Promise<boolean> => {
  try {
    applyNote(await postNote(input));
    Toast.SuccessToast({ title: i18n.t("notes.created") });
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const doUpdateNote = async (id: string, body: string): Promise<boolean> => {
  try {
    applyNote(await patchNote(id, body));
    Toast.SuccessToast({ title: i18n.t("notes.updated") });
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};

export const doDeleteNote = async (id: string): Promise<boolean> => {
  try {
    await deleteNote(id);
    useTrickStore.getState().removeNote(id);
    useRoutineStore.getState().removeNote(id);
    Toast.InfoToast({ title: i18n.t("notes.deleted") });
    return true;
  } catch (error) {
    handleError(error);
    return false;
  }
};
