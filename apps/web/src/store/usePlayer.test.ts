import { beforeEach, describe, expect, test } from "bun:test";

import { buildTimeline } from "@sleightbook/engine/timeline";
import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { JUMP_SETTLE_MS, PHASE_GAP_MS } from "../constants/playback";
import { INITIAL_PLAYER_STATE, getTickDelay, usePlayerStore } from "./usePlayer";

// phaseEnds = [0, 2, 6, 7, 9]; frame durations: 700, 800, 700, 700, 500, 600, 800, 600, 700, 900
const timeline = buildTimeline(AMBITIOUS_CARD.phases);
const player = () => usePlayerStore.getState();

const tickUntilIdle = (limit = 100) => {
  for (let i = 0; i < limit; i += 1) {
    const { frameIndex, targetFrame, isPlaying } = player();
    if (frameIndex === targetFrame && !isPlaying) return;
    player().tick();
  }
  throw new Error("player never became idle");
};

beforeEach(() => {
  usePlayerStore.setState({ ...INITIAL_PLAYER_STATE });
  player().load(timeline);
});

describe("usePlayerStore", () => {
  test("load shows the end of the first phase", () => {
    expect(player()).toMatchObject({
      phaseIndex: 0,
      frameIndex: 0,
      targetFrame: 0,
      isJump: true,
      isPlaying: false,
    });
  });

  test("next animates the following phase frame by frame", () => {
    player().next();
    expect(player()).toMatchObject({ phaseIndex: 1, frameIndex: 0, targetFrame: 2, isJump: true });
    player().tick();
    expect(player()).toMatchObject({ frameIndex: 1, isJump: false });
    player().tick();
    player().tick();
    expect(player().frameIndex).toBe(2);
  });

  test("next on the last phase does nothing", () => {
    player().goToPhase(4);
    player().next();
    expect(player().phaseIndex).toBe(4);
  });

  test("prev jumps to the end of the previous phase and pauses", () => {
    player().goToPhase(3);
    player().play();
    player().prev();
    expect(player()).toMatchObject({
      phaseIndex: 2,
      frameIndex: 6,
      targetFrame: 6,
      isJump: true,
      isPlaying: false,
    });
  });

  test("prev on the first phase stays on it", () => {
    player().prev();
    expect(player()).toMatchObject({ phaseIndex: 0, frameIndex: 0 });
  });

  test("goToPhase clamps and starts from the previous phase end", () => {
    player().goToPhase(99);
    expect(player()).toMatchObject({ phaseIndex: 4, frameIndex: 7, targetFrame: 9 });
    player().goToPhase(0);
    expect(player()).toMatchObject({ phaseIndex: 0, frameIndex: -1, targetFrame: 0 });
  });

  test("play auto-advances through every phase and stops at the end", () => {
    player().play();
    tickUntilIdle();
    expect(player()).toMatchObject({ phaseIndex: 4, frameIndex: 9, isPlaying: false });
  });

  test("play at the end replays from the start", () => {
    player().goToPhase(4);
    tickUntilIdle();
    player().play();
    expect(player()).toMatchObject({
      phaseIndex: 0,
      frameIndex: -1,
      targetFrame: 0,
      isPlaying: true,
    });
  });

  test("togglePlay and view toggles", () => {
    player().togglePlay();
    expect(player().isPlaying).toBe(true);
    player().togglePlay();
    expect(player().isPlaying).toBe(false);
    player().toggleView();
    expect(player().view).toBe("spectator");
    player().setView("secret");
    expect(player().view).toBe("secret");
  });
});

describe("getTickDelay", () => {
  test("idle and not playing → no timer", () => {
    expect(getTickDelay(player(), false)).toBeNull();
  });

  test("first step of a phase waits the settle delay, scaled by speed", () => {
    player().next();
    expect(getTickDelay(player(), false)).toBe(JUMP_SETTLE_MS);
    player().setSpeed(2);
    expect(getTickDelay(player(), false)).toBe(JUMP_SETTLE_MS / 2);
  });

  test("mid-phase waits for the current frame's animation", () => {
    player().next();
    player().tick();
    expect(getTickDelay(player(), false)).toBe(800);
  });

  test("between phases while playing adds the phase gap", () => {
    player().play();
    expect(getTickDelay(player(), false)).toBe(700 + PHASE_GAP_MS);
  });

  test("reduced motion removes animation waits but keeps the phase gap", () => {
    player().next();
    expect(getTickDelay(player(), true)).toBe(0);
    player().goToPhase(0);
    tickUntilIdle();
    player().play();
    expect(getTickDelay(player(), true)).toBe(PHASE_GAP_MS);
  });
});

describe("usePlayerStore — static routines", () => {
  beforeEach(() => {
    usePlayerStore.setState({ ...INITIAL_PLAYER_STATE });
    usePlayerStore.getState().loadStatic(3);
  });

  test("loadStatic resets to the first phase without a timeline", () => {
    expect(usePlayerStore.getState()).toMatchObject({
      timeline: null,
      phaseCount: 3,
      phaseIndex: 0,
      isPlaying: false,
    });
  });

  test("navigation works and clamps", () => {
    const getPlayer = usePlayerStore.getState;
    getPlayer().goToPhase(5);
    expect(getPlayer().phaseIndex).toBe(2);
    getPlayer().next();
    expect(getPlayer().phaseIndex).toBe(2);
    getPlayer().prev();
    expect(getPlayer().phaseIndex).toBe(1);
    getPlayer().goToPhase(-3);
    expect(getPlayer().phaseIndex).toBe(0);
    getPlayer().prev();
    expect(getPlayer().phaseIndex).toBe(0);
  });

  test("play and tick are no-ops", () => {
    usePlayerStore.getState().play();
    usePlayerStore.getState().tick();
    expect(usePlayerStore.getState()).toMatchObject({ isPlaying: false, phaseIndex: 0 });
  });

  test("load(timeline) records the phase count", () => {
    usePlayerStore.getState().load(timeline);
    expect(usePlayerStore.getState().phaseCount).toBe(5);
  });
});
