import { describe, expect, test } from "bun:test";

import { RoutineDetailSchema } from "./routine";

const ID = "00000000-0000-4000-8000-000000000001";

describe("RoutineDetailSchema", () => {
  test("parses a routine with a nested action record", () => {
    const routine = {
      id: ID,
      trickId: ID,
      name: "Standard",
      description: "",
      tips: ["Relax"],
      items: [],
      phases: [
        {
          id: ID,
          position: 0,
          name: "Double Lift",
          summary: "Secret handling",
          explanation: "Two cards as one",
          spectatorText: "The card is shown",
          actions: [
            {
              id: ID,
              position: 0,
              durationMs: 800,
              action: { type: "doubleLift", params: { count: 2 } },
            },
          ],
          techniques: [],
          notes: [],
        },
      ],
    };
    expect(RoutineDetailSchema.parse(routine).phases[0]?.actions[0]?.action.type).toBe(
      "doubleLift",
    );
  });

  test("rejects an unknown action inside a phase", () => {
    const bad = {
      id: ID,
      trickId: ID,
      name: "Standard",
      description: "",
      tips: [],
      items: [],
      phases: [
        {
          id: ID,
          position: 0,
          name: "X",
          summary: "",
          explanation: "",
          spectatorText: "",
          actions: [
            { id: ID, position: 0, durationMs: 800, action: { type: "levitate", params: {} } },
          ],
          techniques: [],
          notes: [],
        },
      ],
    };
    expect(RoutineDetailSchema.safeParse(bad).success).toBe(false);
  });
});
