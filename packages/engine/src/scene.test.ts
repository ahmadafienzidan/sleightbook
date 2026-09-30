import { describe, expect, test } from "bun:test";

import type { TAction } from "@sleightbook/shared/schemas/action";

import { EngineError, type TEngineErrorCode } from "./errors";
import { asDeckScene } from "./guards";
import { applyAction, createEmptyScene } from "./scene";
import type { TScene } from "./types";

const SETUP: TAction = {
  type: "setupDeck",
  params: { named: [{ label: "7C" }, { label: "AH" }], restCount: 50 },
};

const run = (...actions: TAction[]) =>
  asDeckScene(
    actions.reduce<TScene>((state, action) => applyAction(state, action), createEmptyScene()),
  );

const errorCodeOf = (fn: () => unknown): TEngineErrorCode | null => {
  try {
    fn();
  } catch (error) {
    if (error instanceof EngineError) return error.code;
    throw error;
  }
  return null;
};

describe("applyAction", () => {
  test("setupDeck creates face-down named cards on top of the deck", () => {
    const state = run(SETUP);
    expect(state.deck).toEqual(["c1", "c2"]);
    expect(state.restCount).toBe(50);
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "down", perceivedAs: null });
    expect(state.cards.c2?.label).toBe("AH");
  });

  test("any action before setupDeck fails with NOT_SETUP", () => {
    expect(errorCodeOf(() => applyAction(createEmptyScene(), { type: "snap", params: {} }))).toBe(
      "NOT_SETUP",
    );
  });

  test("doubleLift moves the top cards into a single lifted unit", () => {
    const state = run(SETUP, { type: "doubleLift", params: { count: 2 } });
    expect(state.deck).toEqual([]);
    expect(state.lifted).toEqual({ cardIds: ["c1", "c2"], asOne: true });
  });

  test("doubleLift validates deck size and existing lift", () => {
    expect(errorCodeOf(() => run(SETUP, { type: "doubleLift", params: { count: 3 } }))).toBe(
      "DECK_TOO_SMALL",
    );
    expect(
      errorCodeOf(() =>
        run(
          SETUP,
          { type: "doubleLift", params: { count: 2 } },
          { type: "doubleLift", params: { count: 2 } },
        ),
      ),
    ).toBe("ALREADY_LIFTED");
  });

  test("turnOver on a lifted unit reverses it, flips faces and sets perceivedAs", () => {
    const state = run(
      SETUP,
      { type: "doubleLift", params: { count: 2 } },
      { type: "turnOver", params: { target: "lifted" } },
    );
    expect(state.lifted?.cardIds).toEqual(["c2", "c1"]);
    expect(state.cards.c2).toEqual({ id: "c2", label: "AH", face: "up", perceivedAs: "AH" });
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "up", perceivedAs: "AH" });
  });

  test("turning the unit back face down keeps perceivedAs", () => {
    const state = run(
      SETUP,
      { type: "doubleLift", params: { count: 2 } },
      { type: "turnOver", params: { target: "lifted" } },
      { type: "turnOver", params: { target: "lifted" } },
    );
    expect(state.lifted?.cardIds).toEqual(["c1", "c2"]);
    expect(state.cards.c1?.face).toBe("down");
    expect(state.cards.c1?.perceivedAs).toBe("AH");
  });

  test("turnOver lifted without a lift fails with NO_LIFTED", () => {
    expect(errorCodeOf(() => run(SETUP, { type: "turnOver", params: { target: "lifted" } }))).toBe(
      "NO_LIFTED",
    );
  });

  test("turnOver top flips the top deck card and clears perceivedAs when face up", () => {
    const state = run(SETUP, { type: "turnOver", params: { target: "top" } });
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "up", perceivedAs: null });
  });

  test("replace puts the lifted unit back on top", () => {
    const state = run(
      SETUP,
      { type: "doubleLift", params: { count: 2 } },
      { type: "replace", params: {} },
    );
    expect(state.deck).toEqual(["c1", "c2"]);
    expect(state.lifted).toBeNull();
    expect(errorCodeOf(() => run(SETUP, { type: "replace", params: {} }))).toBe("NO_LIFTED");
  });

  test("takeTop and insert bury the top card and jog it", () => {
    const taken = run(SETUP, { type: "takeTop", params: { count: 1 } });
    expect(taken.hand).toEqual(["c1"]);
    expect(taken.deck).toEqual(["c2"]);

    const inserted = asDeckScene(
      applyAction(taken, { type: "insert", params: { depth: "middle" } }),
    );
    expect(inserted.hand).toEqual([]);
    expect(inserted.buried).toEqual(["c1"]);
    expect(inserted.jogged).toBe("c1");
    expect(errorCodeOf(() => run(SETUP, { type: "insert", params: { depth: "middle" } }))).toBe(
      "HAND_EMPTY",
    );
  });

  test("snap clears the jog and sets beat only for one frame", () => {
    const snapped = run(
      SETUP,
      { type: "takeTop", params: { count: 1 } },
      { type: "insert", params: { depth: "middle" } },
      { type: "snap", params: {} },
    );
    expect(snapped.jogged).toBeNull();
    expect(snapped.beat).toBe(true);
    expect(applyAction(snapped, { type: "square", params: {} }).beat).toBe(false);
  });

  test("revealTop turns the top card face up and clears perceivedAs", () => {
    const state = run(SETUP, { type: "revealTop", params: {} });
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "up", perceivedAs: null });
  });

  test("spread and square toggle the fan", () => {
    const spread = run(SETUP, { type: "spread", params: {} });
    expect(spread.spread).toBe(true);
    expect(applyAction(spread, { type: "square", params: {} }).spread).toBe(false);
  });

  test("applyAction never mutates its input", () => {
    const before = run(SETUP, { type: "doubleLift", params: { count: 2 } });
    const snapshot = structuredClone(before);
    applyAction(before, { type: "turnOver", params: { target: "lifted" } });
    expect(before).toEqual(snapshot);
  });
});
