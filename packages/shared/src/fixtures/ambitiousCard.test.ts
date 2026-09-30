import { describe, expect, test } from "bun:test";

import { ActionSchema } from "../schemas/action";
import { AMBITIOUS_CARD } from "./ambitiousCard";

describe("AMBITIOUS_CARD fixture", () => {
  test("has five phases in the documented order", () => {
    expect(AMBITIOUS_CARD.phases.map((phase) => phase.name)).toEqual([
      "Preparation",
      "Double Lift",
      "Insert",
      "Snap",
      "Fan Reveal",
    ]);
  });

  test("has the documented action counts per phase", () => {
    expect(AMBITIOUS_CARD.phases.map((phase) => phase.actions.length)).toEqual([1, 2, 4, 1, 2]);
  });

  test("every action is valid according to ActionSchema", () => {
    for (const phase of AMBITIOUS_CARD.phases) {
      for (const record of phase.actions) {
        expect(ActionSchema.safeParse(record.action).success).toBe(true);
      }
    }
  });

  test("every phase technique exists in the technique list", () => {
    const names = new Set(AMBITIOUS_CARD.techniques.map((technique) => technique.name));
    for (const phase of AMBITIOUS_CARD.phases) {
      for (const technique of phase.techniques) {
        expect(names.has(technique)).toBe(true);
      }
    }
  });
});
