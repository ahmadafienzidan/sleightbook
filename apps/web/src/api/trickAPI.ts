import { localDb } from "./localDb";

// Local data source until the API (Part 2) exists; only these bodies change then.
export const getTricks = async () => localDb.listTricks();

export const getTrick = async (id: string) => localDb.getTrick(id);

export const patchTrickFavorite = async (id: string, isFavorite: boolean) =>
  localDb.setFavorite(id, isFavorite);
