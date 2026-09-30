import { useEffect } from "react";

import { useReducedMotion } from "motion/react";

import { getTickDelay, usePlayerStore } from "../store/usePlayer";

export const useTimelinePlayback = () => {
  const { timeline, phaseIndex, frameIndex, targetFrame, isPlaying, speed, tick } =
    usePlayerStore();
  const reducedMotion = useReducedMotion() ?? false;

  useEffect(() => {
    const delay = getTickDelay(
      { timeline, phaseIndex, frameIndex, targetFrame, isPlaying, speed },
      reducedMotion,
    );
    if (delay === null) return;
    const timer = window.setTimeout(tick, delay);
    return () => window.clearTimeout(timer);
  }, [timeline, phaseIndex, frameIndex, targetFrame, isPlaying, speed, reducedMotion, tick]);

  useEffect(() => () => usePlayerStore.getState().pause(), []);
};
