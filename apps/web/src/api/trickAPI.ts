import { dataSource } from "./dataSource";

export const getTricks = async () => dataSource.listTricks();

export const getTrick = async (id: string) => dataSource.getTrick(id);

export const patchTrickFavorite = async (id: string, isFavorite: boolean) =>
  dataSource.setFavorite(id, isFavorite);
