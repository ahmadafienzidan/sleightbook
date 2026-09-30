import { localDb } from "./localDb";

export const getRoutine = async (id: string) => localDb.getRoutine(id);
