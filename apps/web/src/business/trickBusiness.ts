import type { NavigateFunction } from "react-router";

import type { ITrickSummary } from "@sleightbook/shared/schemas/trick";

import { getTrick, getTricks, patchTrickFavorite } from "../api/trickAPI";
import { toTrickPath } from "../constants/routes";
import { useTrickStore } from "../store/useTrick";
import { handleError } from "./errorHandler";
import { doGetRoutine } from "./routineBusiness";

export const doGetTricks = async (): Promise<ITrickSummary[]> => {
  const { setTricks } = useTrickStore.getState();
  try {
    const tricks = await getTricks();
    setTricks(tricks);
    return tricks;
  } catch (error) {
    handleError(error);
    return [];
  }
};

export const doOpenFirstTrick = async (navigate: NavigateFunction): Promise<boolean> => {
  const [first] = await doGetTricks();
  if (!first) return false;
  navigate(toTrickPath(first.id), { replace: true });
  return true;
};

export const doGetTrick = async (id: string): Promise<void> => {
  const { setTrick, setIsLoading, setError } = useTrickStore.getState();
  try {
    setIsLoading(true);
    setError(null);
    const trick = await getTrick(id);
    setTrick(trick);
    if (trick.defaultRoutineId) await doGetRoutine(trick.defaultRoutineId);
  } catch (error) {
    setError(handleError(error));
  } finally {
    setIsLoading(false);
  }
};

export const doToggleFavorite = async (): Promise<void> => {
  const { trick, setTrick, setFavorite } = useTrickStore.getState();
  if (!trick) return;
  const isFavorite = !trick.isFavorite;
  setFavorite(isFavorite);
  try {
    setTrick(await patchTrickFavorite(trick.id, isFavorite));
  } catch (error) {
    setFavorite(!isFavorite);
    handleError(error);
  }
};
