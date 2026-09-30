import { EngineError, type IEngineErrorInfo } from "./errors";
import { applyAction, createEmptyScene } from "./scene";
import type { IFrame, IPhaseInput, ITimeline, TScene } from "./types";

export type TRoutineValidation = { ok: true } | { ok: false; error: IEngineErrorInfo };

export const buildTimeline = (phases: readonly IPhaseInput[]): ITimeline => {
  if (phases.length === 0)
    throw new EngineError("EMPTY_ROUTINE", "A routine needs at least one phase");

  const initial = createEmptyScene();
  const frames: IFrame[] = [];
  const phaseEnds: number[] = [];
  let state: TScene = initial;

  phases.forEach((phase, phaseIndex) => {
    if (phase.actions.length === 0) {
      const error = new EngineError("EMPTY_PHASE", `Phase ${phaseIndex + 1} has no actions`);
      error.phaseIndex = phaseIndex;
      throw error;
    }
    phase.actions.forEach((record, actionIndex) => {
      try {
        state = applyAction(state, record.action);
      } catch (error) {
        if (error instanceof EngineError) {
          error.phaseIndex = phaseIndex;
          error.actionIndex = actionIndex;
        }
        throw error;
      }
      frames.push({ phaseIndex, actionIndex, state, durationMs: record.durationMs });
    });
    phaseEnds.push(frames.length - 1);
  });

  return { initial, frames, phaseEnds };
};

export const validateRoutine = (phases: readonly IPhaseInput[]): TRoutineValidation => {
  try {
    buildTimeline(phases);
    return { ok: true };
  } catch (error) {
    if (error instanceof EngineError) return { ok: false, error: error.toInfo() };
    throw error;
  }
};

export const stateAt = (timeline: ITimeline, frameIndex: number): TScene => {
  if (frameIndex < 0 || timeline.frames.length === 0) return timeline.initial;
  const clamped = Math.min(frameIndex, timeline.frames.length - 1);
  return timeline.frames[clamped].state;
};
