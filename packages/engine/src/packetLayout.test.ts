import { describe, expect, test } from "bun:test";

import { TRIUMPH_VERNON_PHASES } from "@sleightbook/shared/fixtures/triumph";

import { asPacketProjection } from "./guards";
import { layout } from "./layout";
import { project } from "./project";
import { buildTimeline, stateAt } from "./timeline";
import type { IRenderNode, TView } from "./types";

const timeline = buildTimeline(TRIUMPH_VERNON_PHASES);
const nodesAt = (frameIndex: number, view: TView): IRenderNode[] =>
  layout(project(stateAt(timeline, frameIndex), view));
const byId = (nodes: IRenderNode[], id: string) => nodes.find((node) => node.id === id);

describe("packet projection", () => {
  test("secret view shows the reversed selection inside the face-up half", () => {
    const scene = asPacketProjection(project(stateAt(timeline, 2), "secret"));
    expect(scene).toMatchObject({ kind: "packets", stacked: false, showMixed: false });
    expect(scene.packets).toEqual([
      {
        id: "left",
        count: 26,
        face: "up",
        cards: [{ id: "c1", label: "4S", face: "down", perceivedLabel: null }],
      },
      { id: "right", count: 26, face: "down", cards: [] },
    ]);
  });

  test("spectator view hides named cards and sees the shuffle as mixed", () => {
    expect(
      asPacketProjection(project(stateAt(timeline, 2), "spectator")).packets.map((p) => p.cards),
    ).toEqual([[], []]);
    expect(asPacketProjection(project(stateAt(timeline, 4), "spectator")).showMixed).toBe(true);
    expect(asPacketProjection(project(stateAt(timeline, 4), "secret")).showMixed).toBe(false);
  });
});

describe("packet layout", () => {
  test("setup: one block with the selection peeking out (secret only)", () => {
    const secret = nodesAt(0, "secret");
    expect(byId(secret, "packet-main")).toMatchObject({
      kind: "packetBlock",
      zone: "packet",
      x: 144,
      y: 110,
      z: 10,
      face: "down",
    });
    expect(byId(secret, "c1")).toMatchObject({
      zone: "packet",
      x: 174,
      y: 112,
      z: 11,
      face: "down",
      highlight: "none",
    });
    expect(nodesAt(0, "spectator").map((node) => node.id)).toEqual(["packet-main"]);
  });

  test("cut & turn: halves side by side, selection reversed in the face-up half", () => {
    const nodes = nodesAt(2, "secret");
    expect(byId(nodes, "packet-left")).toMatchObject({ x: 89, y: 110, z: 10, face: "up" });
    expect(byId(nodes, "packet-right")).toMatchObject({ x: 199, y: 110, z: 20, face: "down" });
    expect(byId(nodes, "c1")).toMatchObject({
      x: 119,
      y: 112,
      z: 11,
      face: "down",
      highlight: "reversed",
    });
  });

  test("shuffle: secret shows two stacked halves, spectator one mixed block", () => {
    const secret = nodesAt(3, "secret");
    expect(byId(secret, "packet-right")).toMatchObject({ x: 144, y: 102, z: 20, face: "down" });
    expect(byId(secret, "packet-left")).toMatchObject({ x: 144, y: 110, z: 10, face: "up" });
    expect(secret.filter((node) => node.kind === "mixedBlock")).toHaveLength(0);
    expect(nodesAt(3, "spectator")).toEqual([
      {
        id: "mixed-block",
        kind: "mixedBlock",
        zone: "packet",
        x: 144,
        y: 110,
        rotation: 0,
        z: 1,
        face: "down",
        label: "",
        perceivedLabel: null,
        highlight: "none",
      },
    ]);
  });

  test("correction: selection now face up and reversed against its face-down half", () => {
    expect(byId(nodesAt(4, "secret"), "c1")).toMatchObject({ face: "up", highlight: "reversed" });
  });

  test("reveal: fan with the face-up selection in the middle, in both views", () => {
    for (const view of ["secret", "spectator"] as const) {
      const nodes = nodesAt(6, view);
      expect(nodes.filter((node) => node.kind === "fanCard")).toHaveLength(9);
      expect(byId(nodes, "c1")).toMatchObject({
        zone: "fan",
        x: 156.67,
        y: 121.5,
        rotation: 2.22,
        z: 6,
        face: "up",
        label: "4S",
        highlight: "none",
      });
      expect(byId(nodes, "fan-0")).toMatchObject({ x: 30, y: 133.5, rotation: -20, z: 1 });
    }
  });
});
