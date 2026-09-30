import { expect, test } from "bun:test";

import { LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";

import { validateRoutine } from "./timeline";

test("every visual routine in the library is a valid engine timeline", () => {
  const visual = LIBRARY_FIXTURE.tricks.flatMap((entry) =>
    entry.routines
      .filter((routine) => routine.phases.every((phase) => phase.actions.length > 0))
      .map((routine) => ({
        name: `${entry.trick.name} / ${routine.name}`,
        phases: routine.phases,
      })),
  );
  expect(visual.map((routine) => routine.name)).toEqual([
    "Ambitious Card / Standard",
    "Triumph / Vernon",
  ]);
  for (const routine of visual) {
    expect(validateRoutine(routine.phases)).toEqual({ ok: true });
  }
});
