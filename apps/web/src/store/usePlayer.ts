import { create } from "zustand";

import type { ITimeline, TView } from "@sleightbook/engine/types";

import { JUMP_SETTLE_MS, PHASE_GAP_MS } from "../constants/playback";
import type { TSpeed } from "../types/player.types";

export interface IPlayerState {
  timeline: ITimeline | null;
  phaseCount: number;
  phaseIndex: number;
  frameIndex: number;
  targetFrame: number;
  isJump: boolean;
  isPlaying: boolean;
  speed: TSpeed;
  view: TView;
  showExplanations: boolean;
}

interface IPlayerStore extends IPlayerState {
  load: (timeline: ITimeline) => void;
  loadStatic: (phaseCount: number) => void;
  goToPhase: (index: number) => void;
  next: () => void;
  prev: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  replay: () => void;
  tick: () => void;
  setSpeed: (speed: TSpeed) => void;
  setView: (view: TView) => void;
  toggleView: () => void;
  setShowExplanations: (showExplanations: boolean) => void;
}

export type TTickInput = Pick<
  IPlayerState,
  "timeline" | "phaseIndex" | "frameIndex" | "targetFrame" | "isPlaying" | "speed"
>;

export const INITIAL_PLAYER_STATE: IPlayerState = {
  timeline: null,
  phaseCount: 0,
  phaseIndex: 0,
  frameIndex: -1,
  targetFrame: -1,
  isJump: true,
  isPlaying: false,
  speed: 1,
  view: "secret",
  showExplanations: true,
};

const lastPhaseIndex = (timeline: ITimeline): number => timeline.phaseEnds.length - 1;

const phaseStartFrame = (timeline: ITimeline, phaseIndex: number): number =>
  phaseIndex === 0 ? -1 : timeline.phaseEnds[phaseIndex - 1];

export const usePlayerStore = create<IPlayerStore>((set, get) => ({
  ...INITIAL_PLAYER_STATE,
  load: (timeline) => {
    const firstEnd = timeline.phaseEnds[0];
    set({
      timeline,
      phaseCount: timeline.phaseEnds.length,
      phaseIndex: 0,
      frameIndex: firstEnd,
      targetFrame: firstEnd,
      isJump: true,
      isPlaying: false,
    });
  },
  loadStatic: (phaseCount) =>
    set({
      timeline: null,
      phaseCount,
      phaseIndex: 0,
      frameIndex: -1,
      targetFrame: -1,
      isJump: true,
      isPlaying: false,
    }),
  goToPhase: (index) => {
    const { timeline, phaseCount } = get();
    if (!timeline) {
      if (phaseCount > 0) set({ phaseIndex: Math.min(Math.max(index, 0), phaseCount - 1) });
      return;
    }
    const phaseIndex = Math.min(Math.max(index, 0), lastPhaseIndex(timeline));
    set({
      phaseIndex,
      frameIndex: phaseStartFrame(timeline, phaseIndex),
      targetFrame: timeline.phaseEnds[phaseIndex],
      isJump: true,
    });
  },
  next: () => {
    const { timeline, phaseIndex, phaseCount, goToPhase } = get();
    const lastPhase = timeline ? lastPhaseIndex(timeline) : phaseCount - 1;
    if (phaseIndex >= lastPhase) return;
    goToPhase(phaseIndex + 1);
  },
  prev: () => {
    const { timeline, phaseIndex } = get();
    if (!timeline) {
      set({ phaseIndex: Math.max(phaseIndex - 1, 0) });
      return;
    }
    const target = Math.max(phaseIndex - 1, 0);
    const frame = timeline.phaseEnds[target];
    set({
      phaseIndex: target,
      frameIndex: frame,
      targetFrame: frame,
      isJump: true,
      isPlaying: false,
    });
  },
  play: () => {
    const { timeline, phaseIndex, frameIndex, replay } = get();
    if (!timeline) return;
    const isAtEnd =
      phaseIndex === lastPhaseIndex(timeline) && frameIndex === timeline.phaseEnds[phaseIndex];
    if (isAtEnd) {
      replay();
      return;
    }
    set({ isPlaying: true });
  },
  pause: () => set({ isPlaying: false }),
  togglePlay: () => {
    const { isPlaying, play, pause } = get();
    if (isPlaying) pause();
    else play();
  },
  replay: () => {
    const { timeline, goToPhase } = get();
    if (!timeline) return;
    goToPhase(0);
    set({ isPlaying: true });
  },
  tick: () => {
    const { timeline, frameIndex, targetFrame, isPlaying, phaseIndex, goToPhase } = get();
    if (!timeline) return;
    if (frameIndex < targetFrame) {
      set({ frameIndex: frameIndex + 1, isJump: false });
      return;
    }
    if (!isPlaying) return;
    if (phaseIndex < lastPhaseIndex(timeline)) {
      goToPhase(phaseIndex + 1);
      return;
    }
    set({ isPlaying: false });
  },
  setSpeed: (speed) => set({ speed }),
  setView: (view) => set({ view }),
  toggleView: () => set(({ view }) => ({ view: view === "secret" ? "spectator" : "secret" })),
  setShowExplanations: (showExplanations) => set({ showExplanations }),
}));

export const getTickDelay = (state: TTickInput, reducedMotion: boolean): number | null => {
  const { timeline, phaseIndex, frameIndex, targetFrame, isPlaying, speed } = state;
  if (!timeline) return null;
  const isAnimating = frameIndex < targetFrame;
  if (!isAnimating && !isPlaying) return null;
  if (reducedMotion) return isAnimating ? 0 : PHASE_GAP_MS;

  const isPhaseStart = frameIndex < 0 || frameIndex === phaseStartFrame(timeline, phaseIndex);
  const currentDuration = isPhaseStart ? JUMP_SETTLE_MS : timeline.frames[frameIndex].durationMs;
  return (isAnimating ? currentDuration : currentDuration + PHASE_GAP_MS) / speed;
};
