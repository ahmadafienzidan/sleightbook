import { describe, expect, test } from "bun:test";

import { LIBRARY_FIXTURE } from "./library";

describe("LIBRARY_FIXTURE", () => {
  test("has the six prototype tricks", () => {
    expect(LIBRARY_FIXTURE.tricks.map((entry) => entry.trick.name)).toEqual([
      "Ambitious Card",
      "Triumph",
      "Oil & Water",
      "Coin Matrix",
      "Thought Card",
      "Rising Card",
    ]);
    expect(new Set(LIBRARY_FIXTURE.tricks.map((entry) => entry.trick.slug)).size).toBe(6);
  });

  test("every trick has exactly one default routine", () => {
    for (const entry of LIBRARY_FIXTURE.tricks) {
      expect(entry.routines.filter((routine) => routine.isDefault)).toHaveLength(1);
    }
  });

  test("Ambitious Card offers three routines", () => {
    const ambitious = LIBRARY_FIXTURE.tricks[0];
    expect(ambitious?.routines.map((routine) => routine.name)).toEqual([
      "Standard",
      "Elmsley Version",
      "Top Change Version",
    ]);
  });

  test("a routine is either fully visual or fully text-only", () => {
    for (const entry of LIBRARY_FIXTURE.tricks) {
      for (const routine of entry.routines) {
        expect(routine.phases.length).toBeGreaterThan(0);
        const withActions = routine.phases.filter((phase) => phase.actions.length > 0).length;
        expect([0, routine.phases.length]).toContain(withActions);
      }
    }
  });

  test("every referenced technique and item exists in the catalogs", () => {
    const techniques = new Set(LIBRARY_FIXTURE.techniques.map((technique) => technique.name));
    const items = new Set(LIBRARY_FIXTURE.items.map((item) => item.name));
    expect(techniques.size).toBe(12);
    expect(items.size).toBe(6);
    for (const entry of LIBRARY_FIXTURE.tricks) {
      for (const routine of entry.routines) {
        for (const name of routine.items) expect(items.has(name)).toBe(true);
        for (const phase of routine.phases) {
          for (const name of phase.techniques) expect(techniques.has(name)).toBe(true);
        }
      }
    }
  });
});
