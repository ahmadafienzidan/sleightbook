import { describe, expect, test } from "bun:test";

import { formatCardLabel, formatSpeed } from "./format";

describe("formatCardLabel", () => {
  test("formats suits and colors", () => {
    expect(formatCardLabel("AH")).toEqual({ rank: "A", suit: "♥", isRed: true, text: "A♥" });
    expect(formatCardLabel("7C")).toEqual({ rank: "7", suit: "♣", isRed: false, text: "7♣" });
    expect(formatCardLabel("10D")).toEqual({ rank: "10", suit: "♦", isRed: true, text: "10♦" });
  });

  test("passes through labels without a suit", () => {
    expect(formatCardLabel("X")).toEqual({ rank: "X", suit: "", isRed: false, text: "X" });
  });
});

describe("formatSpeed", () => {
  test.each([
    [0.5, "0.5×"],
    [0.75, "0.75×"],
    [1, "1.0×"],
    [1.25, "1.25×"],
    [2, "2.0×"],
  ])("%p → %p", (speed, expected) => {
    expect(formatSpeed(speed)).toBe(expected);
  });
});
