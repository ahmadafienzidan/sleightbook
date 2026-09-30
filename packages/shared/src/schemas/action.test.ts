import { describe, expect, test } from "bun:test";

import { ActionSchema, PACKET_ACTION_TYPES } from "./action";

describe("ActionSchema", () => {
  test.each([
    { type: "setupDeck", params: { named: [{ label: "7C" }, { label: "AH" }], restCount: 50 } },
    { type: "doubleLift", params: { count: 2 } },
    { type: "turnOver", params: { target: "lifted" } },
    { type: "turnOver", params: { target: "top" } },
    { type: "replace", params: {} },
    { type: "takeTop", params: { count: 1 } },
    { type: "insert", params: { depth: "middle" } },
    { type: "square", params: {} },
    { type: "snap", params: {} },
    { type: "revealTop", params: {} },
    { type: "spread", params: {} },
  ])("accepts %o", (action) => {
    expect(ActionSchema.safeParse(action).success).toBe(true);
  });

  test.each([
    { type: "levitate", params: {} },
    { type: "doubleLift", params: { count: 1 } },
    { type: "doubleLift", params: { count: 5 } },
    { type: "turnOver", params: { target: "hand" } },
    { type: "setupDeck", params: { named: [], restCount: 10 } },
    { type: "setupDeck", params: { named: [{ label: "AH" }], restCount: -1 } },
    { type: "takeTop", params: { count: 0 } },
    { type: "snap", params: { loud: true } },
    { type: "snap" },
  ])("rejects %o", (action) => {
    expect(ActionSchema.safeParse(action).success).toBe(false);
  });
});

describe("ActionSchema — packet actions", () => {
  test.each([
    { type: "setupPackets", params: { selection: { label: "4S" }, count: 52 } },
    { type: "setupPackets", params: { selection: { label: "AH" }, count: 20 } },
    { type: "cutHalves", params: {} },
    { type: "turnPacket", params: { packet: "left", keepTop: true, covert: false } },
    { type: "turnPacket", params: { packet: "right", keepTop: false, covert: true } },
    { type: "riffle", params: { mode: "stripOut" } },
    { type: "spreadReveal", params: {} },
  ])("accepts %o", (action) => {
    expect(ActionSchema.safeParse(action).success).toBe(true);
  });

  test.each([
    { type: "setupPackets", params: { selection: { label: "4S" }, count: 19 } },
    { type: "setupPackets", params: { selection: { label: "" }, count: 52 } },
    { type: "turnPacket", params: { packet: "main", keepTop: true, covert: false } },
    { type: "turnPacket", params: { packet: "left", keepTop: true } },
    { type: "riffle", params: { mode: "real" } },
    { type: "cutHalves", params: { at: 26 } },
  ])("rejects %o", (action) => {
    expect(ActionSchema.safeParse(action).success).toBe(false);
  });

  test("PACKET_ACTION_TYPES lists the packet-only step actions", () => {
    expect([...PACKET_ACTION_TYPES]).toEqual(["cutHalves", "turnPacket", "riffle", "spreadReveal"]);
  });
});
