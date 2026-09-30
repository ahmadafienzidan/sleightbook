import { describe, expect, test } from "bun:test";

import type { TAction } from "@sleightbook/shared/schemas/action";
import { TRIUMPH_VERNON_PHASES } from "@sleightbook/shared/fixtures/triumph";

import { EngineError, type TEngineErrorCode } from "./errors";
import { asPacketScene } from "./guards";
import { applyAction, createEmptyScene } from "./scene";
import { buildTimeline, validateRoutine } from "./timeline";
import type { IPacketScene, TScene } from "./types";

const SETUP: TAction = { type: "setupPackets", params: { selection: { label: "4S" }, count: 52 } };
const CUT: TAction = { type: "cutHalves", params: {} };
const TURN_LEFT_KEEP: TAction = {
  type: "turnPacket",
  params: { packet: "left", keepTop: true, covert: false },
};
const RIFFLE: TAction = { type: "riffle", params: { mode: "stripOut" } };
const CORRECT: TAction = {
  type: "turnPacket",
  params: { packet: "left", keepTop: false, covert: true },
};

const run = (...actions: TAction[]): IPacketScene =>
  asPacketScene(
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

describe("packet scene reducer", () => {
  test("setupPackets creates one face-down packet holding the selection", () => {
    const state = run(SETUP);
    expect(state.kind).toBe("packets");
    expect(state.cards.c1).toEqual({ id: "c1", label: "4S", face: "down", perceivedAs: null });
    expect(state.packets).toEqual([
      { id: "main", count: 52, face: "down", perceivedFace: "down", namedIds: ["c1"] },
    ]);
    expect(state).toMatchObject({ stacked: true, perceivedMixed: false, spread: false });
  });

  test("cutHalves splits into left (with named cards) and right", () => {
    expect(run(SETUP, CUT).packets).toEqual([
      { id: "left", count: 26, face: "down", perceivedFace: "down", namedIds: ["c1"] },
      { id: "right", count: 26, face: "down", perceivedFace: "down", namedIds: [] },
    ]);
    const odd = run(
      { type: "setupPackets", params: { selection: { label: "4S" }, count: 25 } },
      CUT,
    );
    expect(odd.packets.map((packet) => packet.count)).toEqual([13, 12]);
    expect(odd.stacked).toBe(false);
  });

  test("turnPacket with keepTop flips the packet but not its top named card", () => {
    const state = run(SETUP, CUT, TURN_LEFT_KEEP);
    expect(state.packets[0]).toMatchObject({
      id: "left",
      face: "up",
      perceivedFace: "up",
      namedIds: ["c1"],
    });
    expect(state.cards.c1?.face).toBe("down");
  });

  test("covert turnPacket keeps the spectator's perceived face", () => {
    const state = run(SETUP, CUT, TURN_LEFT_KEEP, RIFFLE, CORRECT);
    const left = state.packets.find((packet) => packet.id === "left");
    expect(left).toMatchObject({ face: "down", perceivedFace: "up" });
    expect(state.cards.c1?.face).toBe("up");
  });

  test("riffle stacks right over left and makes the spectator believe it is mixed", () => {
    const state = run(SETUP, CUT, TURN_LEFT_KEEP, RIFFLE);
    expect(state.packets.map((packet) => packet.id)).toEqual(["right", "left"]);
    expect(state).toMatchObject({ stacked: true, perceivedMixed: true });
  });

  test("spreadReveal shows the truth", () => {
    const state = run(SETUP, CUT, TURN_LEFT_KEEP, RIFFLE, CORRECT, {
      type: "spreadReveal",
      params: {},
    });
    expect(state).toMatchObject({ spread: true, perceivedMixed: false });
    expect(state.packets.every((packet) => packet.perceivedFace === packet.face)).toBe(true);
  });

  test("snap sets beat for one frame", () => {
    const snapped = run(SETUP, { type: "snap", params: {} });
    expect(snapped.beat).toBe(true);
    expect(asPacketScene(applyAction(snapped, CUT)).beat).toBe(false);
  });

  test("errors: NOT_SETUP, WRONG_SCENE, NO_PACKET", () => {
    expect(errorCodeOf(() => applyAction(createEmptyScene(), CUT))).toBe("NOT_SETUP");
    expect(errorCodeOf(() => run(SETUP, { type: "doubleLift", params: { count: 2 } }))).toBe(
      "WRONG_SCENE",
    );
    expect(
      errorCodeOf(() =>
        applyAction(
          applyAction(createEmptyScene(), {
            type: "setupDeck",
            params: { named: [{ label: "AH" }], restCount: 10 },
          }),
          CUT,
        ),
      ),
    ).toBe("WRONG_SCENE");
    expect(errorCodeOf(() => run(SETUP, RIFFLE))).toBe("NO_PACKET");
    expect(errorCodeOf(() => run(SETUP, TURN_LEFT_KEEP))).toBe("NO_PACKET");
  });

  test("applyAction never mutates a packet scene", () => {
    const before = run(SETUP, CUT);
    const snapshot = structuredClone(before);
    applyAction(before, TURN_LEFT_KEEP);
    expect(before).toEqual(snapshot);
  });
});

describe("Triumph timeline", () => {
  const timeline = buildTimeline(TRIUMPH_VERNON_PHASES);

  test("frames and phase ends", () => {
    expect(timeline.frames).toHaveLength(7);
    expect(timeline.phaseEnds).toEqual([0, 2, 3, 4, 6]);
    expect(validateRoutine(TRIUMPH_VERNON_PHASES)).toEqual({ ok: true });
  });

  test("final state: everything face down except the face-up selection", () => {
    const final = asPacketScene(timeline.frames[6]?.state);
    expect(final.cards.c1?.face).toBe("up");
    expect(final.packets.every((packet) => packet.face === "down")).toBe(true);
    expect(final).toMatchObject({ perceivedMixed: false, spread: true });
  });
});
