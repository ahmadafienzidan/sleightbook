import { describe, expect, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { layout } from "./layout";
import { project } from "./project";
import { buildTimeline, stateAt } from "./timeline";
import type { IRenderNode, TView } from "./types";

const timeline = buildTimeline(AMBITIOUS_CARD.phases);
const nodesAt = (frameIndex: number, view: TView): IRenderNode[] =>
  layout(project(stateAt(timeline, frameIndex), view));
const byId = (nodes: IRenderNode[], id: string): IRenderNode | undefined =>
  nodes.find((node) => node.id === id);

describe("layout", () => {
  test("setup: deck block with two named cards stacked on top", () => {
    const nodes = nodesAt(0, "secret");
    expect(nodes.map((node) => node.id)).toEqual(["deck-block", "c2", "c1"]);
    expect(byId(nodes, "deck-block")).toMatchObject({
      kind: "deckBlock",
      zone: "block",
      x: 144,
      y: 110,
      z: 1,
    });
    expect(byId(nodes, "c1")).toMatchObject({ zone: "deck", x: 144, y: 106, z: 12, face: "down" });
    expect(byId(nodes, "c2")).toMatchObject({ zone: "deck", x: 144, y: 108, z: 11 });
  });

  test("double lift (secret): both lifted cards visible with an offset", () => {
    const nodes = nodesAt(2, "secret");
    expect(byId(nodes, "c2")).toMatchObject({
      zone: "lifted",
      x: 164,
      y: 50,
      rotation: 6,
      z: 32,
      face: "up",
    });
    expect(byId(nodes, "c1")).toMatchObject({
      zone: "lifted",
      x: 170,
      y: 56,
      z: 31,
      perceivedLabel: "AH",
      highlight: "perceived",
    });
  });

  test("double lift (spectator): a single lifted card", () => {
    const lifted = nodesAt(2, "spectator").filter((node) => node.zone === "lifted");
    expect(lifted).toHaveLength(1);
    expect(lifted[0]).toMatchObject({ id: "c2", label: "AH", highlight: "none" });
  });

  test("insert: buried card sticks out of the deck", () => {
    expect(byId(nodesAt(6, "secret"), "c1")).toMatchObject({
      zone: "buried",
      x: 174,
      y: 112,
      z: 0,
      label: "7C",
      highlight: "perceived",
    });
    expect(byId(nodesAt(6, "spectator"), "c1")).toMatchObject({ label: "AH", highlight: "jogged" });
  });

  test("hand: a taken card sits to the right of the deck", () => {
    expect(byId(nodesAt(5, "secret"), "c1")).toMatchObject({
      zone: "hand",
      x: 272,
      y: 120,
      rotation: -8,
      z: 40,
    });
  });

  test("fan reveal: nine fan cards then A♥ face up at the end", () => {
    const nodes = nodesAt(9, "secret");
    expect(byId(nodes, "deck-block")).toBeUndefined();
    expect(nodes.filter((node) => node.kind === "fanCard")).toHaveLength(9);
    expect(byId(nodes, "fan-0")).toMatchObject({
      zone: "fan",
      x: 30,
      y: 133.5,
      rotation: -20,
      z: 1,
    });
    expect(byId(nodes, "c2")).toMatchObject({
      zone: "fan",
      x: 258,
      y: 133.5,
      rotation: 20,
      z: 10,
      face: "up",
    });
    expect(nodes.at(-1)?.id).toBe("c2");
  });

  test("fan reveal: the buried card stays inside the fan", () => {
    const secretNodes = nodesAt(9, "secret");
    expect(byId(secretNodes, "c1")).toMatchObject({
      zone: "buried",
      x: 131.33,
      y: 121.5,
      rotation: -2.22,
      z: 5.5,
      label: "7C",
      perceivedLabel: "AH",
      highlight: "perceived",
    });

    const spectatorNodes = nodesAt(9, "spectator");
    expect(byId(spectatorNodes, "c1")).toMatchObject({ label: "AH" });
  });

  test("nodes are sorted by z", () => {
    const zs = nodesAt(6, "secret").map((node) => node.z);
    expect(zs).toEqual([...zs].sort((a, b) => a - b));
  });
});
