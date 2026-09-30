import { buildTimeline } from "@sleightbook/engine/timeline";

import { getRoutine } from "../api/routineAPI";
import { usePlayerStore } from "../store/usePlayer";
import { useRoutineStore } from "../store/useRoutine";
import { handleError } from "./errorHandler";

export const doGetRoutine = async (id: string): Promise<void> => {
  const { setRoutine, setError } = useRoutineStore.getState();
  try {
    setError(null);
    const routine = await getRoutine(id);
    setRoutine(routine);
    usePlayerStore.getState().load(buildTimeline(routine.phases));
  } catch (error) {
    setError(handleError(error));
  }
};
