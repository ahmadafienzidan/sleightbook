import { describe, expect, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { EngineError } from "./errors";
import { asDeckScene } from "./guards";
import { buildTimeline, stateAt, validateRoutine } from "./timeline";

describe("buildTimeline", () => {
  const timeline = buildTimeline(AMBITIOUS_CARD.phases);

  test("produces one frame per action and records phase ends", () => {
    expect(timeline.frames).toHaveLength(10);
    expect(timeline.phaseEnds).toEqual([0, 2, 6, 7, 9]);
    expect(timeline.frames[3]).toMatchObject({ phaseIndex: 2, actionIndex: 0, durationMs: 700 });
  });

  test("end of Double Lift: two cards lifted face up, perceived as A♥", () => {
    const state = asDeckScene(timeline.frames[2]?.state);
    expect(state.lifted?.cardIds).toEqual(["c2", "c1"]);
    expect(state.cards.c1?.perceivedAs).toBe("AH");
  });

  test("end of Insert: 7♣ buried and jogged, A♥ on top", () => {
    const state = asDeckScene(timeline.frames[6]?.state);
    expect(state.deck).toEqual(["c2"]);
    expect(state.buried).toEqual(["c1"]);
    expect(state.jogged).toBe("c1");
  });

  test("end of Fan Reveal: A♥ face up on top and deck spread", () => {
    const state = asDeckScene(timeline.frames[9]?.state);
    expect(state.deck[0]).toBe("c2");
    expect(state.cards.c2?.face).toBe("up");
    expect(state.spread).toBe(true);
  });

  test("errors carry phase and action indexes", () => {
    try {
      buildTimeline([
        AMBITIOUS_CARD.phases[0] ?? { actions: [] },
        { actions: [{ action: { type: "replace", params: {} }, durationMs: 500 }] },
      ]);
      throw new Error("expected EngineError");
    } catch (error) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).toInfo()).toMatchObject({
        code: "NO_LIFTED",
        phaseIndex: 1,
        actionIndex: 0,
      });
    }
  });
});

describe("validateRoutine", () => {
  test("accepts the Ambitious Card routine", () => {
    expect(validateRoutine(AMBITIOUS_CARD.phases)).toEqual({ ok: true });
  });

  test("rejects an empty routine and an empty phase", () => {
    expect(validateRoutine([])).toMatchObject({ ok: false, error: { code: "EMPTY_ROUTINE" } });
    expect(validateRoutine([{ actions: [] }])).toMatchObject({
      ok: false,
      error: { code: "EMPTY_PHASE", phaseIndex: 0 },
    });
  });

  test("rejects an action before setup", () => {
    expect(
      validateRoutine([{ actions: [{ action: { type: "snap", params: {} }, durationMs: 600 }] }]),
    ).toMatchObject({ ok: false, error: { code: "NOT_SETUP", phaseIndex: 0, actionIndex: 0 } });
  });
});

describe("stateAt", () => {
  const timeline = buildTimeline(AMBITIOUS_CARD.phases);

  test("returns the initial empty scene for negative indexes", () => {
    expect(stateAt(timeline, -1)).toBe(timeline.initial);
    expect(asDeckScene(stateAt(timeline, -1)).deck).toEqual([]);
  });

  test("returns frame states and clamps past the end", () => {
    expect(stateAt(timeline, 2)).toBe(timeline.frames[2]?.state);
    expect(stateAt(timeline, 99)).toBe(timeline.frames[9]?.state);
  });
});
