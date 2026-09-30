import { describe, expect, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { asDeckProjection } from "./guards";
import { project } from "./project";
import { buildTimeline, stateAt } from "./timeline";

const timeline = buildTimeline(AMBITIOUS_CARD.phases);
const END_OF_DOUBLE_LIFT = 2;
const END_OF_INSERT = 6;

describe("project", () => {
  test("secret view shows both lifted cards and marks the impostor", () => {
    const scene = asDeckProjection(project(stateAt(timeline, END_OF_DOUBLE_LIFT), "secret"));
    expect(scene.lifted?.cards).toEqual([
      { id: "c2", label: "AH", face: "up", perceivedLabel: null },
      { id: "c1", label: "7C", face: "up", perceivedLabel: "AH" },
    ]);
  });

  test("spectator view collapses the double lift into one card", () => {
    const scene = asDeckProjection(project(stateAt(timeline, END_OF_DOUBLE_LIFT), "spectator"));
    expect(scene.lifted?.cards).toEqual([
      { id: "c2", label: "AH", face: "up", perceivedLabel: null },
    ]);
  });

  test("secret view reveals the buried card is really 7♣", () => {
    const scene = asDeckProjection(project(stateAt(timeline, END_OF_INSERT), "secret"));
    expect(scene.buried).toEqual([{ id: "c1", label: "7C", face: "down", perceivedLabel: "AH" }]);
    expect(scene.joggedId).toBe("c1");
  });

  test("spectator view believes the buried card is A♥", () => {
    const scene = asDeckProjection(project(stateAt(timeline, END_OF_INSERT), "spectator"));
    expect(scene.buried).toEqual([{ id: "c1", label: "AH", face: "down", perceivedLabel: null }]);
  });

  test("copies scalar scene fields", () => {
    const scene = asDeckProjection(project(stateAt(timeline, 7), "spectator"));
    expect(scene).toMatchObject({ view: "spectator", restCount: 50, beat: true, spread: false });
  });
});
