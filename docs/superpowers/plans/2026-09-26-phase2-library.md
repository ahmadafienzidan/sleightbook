# Sleightbook Phase 2 — Library, Techniques, Gimmicks, Variations & Triumph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-trick MVP1 into a 6-trick library with search/filters/favorites, reusable technique & gimmick pages, selectable routine variations, and a second visualized trick (Triumph) built on a new `packets` engine scene.

**Architecture:** Engine gains a second scene family (`kind: "packets"`) beside the MVP1 deck scene; `project`/`layout` dispatch on `kind`. Shared gets a library fixture (catalog of techniques/items + 6 tricks) and new DTO schemas. The web local data layer moves to a normalized v2 store (records + DTO assembly, like the future API) with search and a v1→v2 migration. UI adds Library, Favorites, Technique and Item pages, a routine switcher, and a text-only phase viewer for routines without visualization.

**Tech Stack:** Bun, TypeScript 7, Zod 4, React 19, Vite, Tailwind v4, Motion, React Router 7, Zustand, react-i18next, Playwright, Biome 2.5.

**Spec:** [`docs/superpowers/specs/2026-09-26-sleightbook-phase2-library-design.md`](../specs/2026-09-26-sleightbook-phase2-library-design.md) (builds on [MVP1 spec](../specs/2026-09-26-sleightbook-mvp1-design.md))

## Global Constraints

- **NO GIT COMMITS** (user rule D8/P8). Leave every change uncommitted.
- Part 2 (API/Postgres) stays postponed: all data is local (`localStorage`), behind `apps/web/src/api/*API.ts` async functions; `business/`, `store/`, `components/`, `contents/` never know the data is local and components never import `api/`.
- Conventions (CONVENTIONS + MVP1): named exports; `interface XxxProps` above components; hooks → handlers (`handle*`) → JSX → internal sub-components at the bottom; business functions `do*`; stores read in business via `.getState()`; `import type` for types; prefixes `I`/`T`; constants `SCREAMING_SNAKE_CASE`; no `any`; no barrel files; no hex colors in components (Tailwind tokens only); every `<button>` has an explicit `type`; icon-only buttons have `aria-label`; toggles use `aria-pressed`; minimum text `text-xs` in HTML.
- All UI strings through `t()`; `en.json` and `id.json` keep identical key sets (enforced by `locales.test.ts`). Plural keys use i18next `_one`/`_other` in **both** files.
- No dead UI. MVP1 behaviour (playback semantics, notes, favorites, i18n, a11y) must not regress; the 8 MVP1 E2E tests keep passing (adapted only where `/` changed from redirect to Library).
- Each task ends with `bunx biome check --write <touched dirs>`, `bun run typecheck` (root) and the touched packages' tests passing.
- Seed/fixture content is English; technique & item catalogs are shared across tricks (referenced by name in the fixture, by id in the local DB).
- Local DB: v2 key `sleightbook.db.v2`; v1 key `sleightbook.db.v1` is migrated once then moved to `sleightbook.db.v1.migrated`.

## Rulings made while planning (deviations from the spec text, all minor)

- `RoutineDetailSchema` gains `items` (needed so the hero/props show the **selected** routine's items — spec §6.2).
- `IPacket` gains `perceivedFace` (how `covert` in spec §3.3 is represented).
- Engine MVP1 tests are touched only to add scene-narrowing helpers (`asDeckScene`, `asDeckProjection`) because `applyAction`/`stateAt`/`project` now return unions.
- Library card favorite button uses a stable label `Favorite {{name}}` + `aria-pressed` (addresses MVP1 final-review minor 6 for the new UI).
- `localDb.listTricks()` stays (used by tests); its app plumbing (`getTricks`, `doGetTricks`, `doOpenFirstTrick`, `useTrick.tricks`) is removed in Task 9.

## File Map

```text
packages/shared/src/schemas/action.ts        + packet actions, PACKET_ACTION_TYPES
packages/shared/src/schemas/trick.ts         + TrickCard, LibraryQuery, LIBRARY_CATEGORIES; RoutineSummary.hasVisualization
packages/shared/src/schemas/routine.ts       RoutineDetail.items
packages/shared/src/schemas/usage.ts         NEW UsageSchema
packages/shared/src/schemas/technique.ts     NEW TechniqueSummary/Detail
packages/shared/src/schemas/item.ts          NEW ItemSummary/Detail
packages/shared/src/fixtures/triumph.ts      NEW TRIUMPH_VERNON_PHASES
packages/shared/src/fixtures/library.ts      NEW LIBRARY_FIXTURE
packages/engine/src/types.ts                 kind discriminators, packet scene & projection types, node kinds
packages/engine/src/errors.ts                + WRONG_SCENE, NO_PACKET
packages/engine/src/guards.ts                NEW asDeckScene/asPacketScene/asDeckProjection/asPacketProjection
packages/engine/src/packets.ts               NEW setupPackets, applyPacketAction
packages/engine/src/scene.ts                 dispatch deck vs packets
packages/engine/src/timeline.ts              TScene
packages/engine/src/project.ts               dispatch + packet projection
packages/engine/src/layout.ts                dispatch + packet layout
apps/web/src/store/usePlayer.ts              phaseCount, loadStatic
apps/web/src/api/localSchemas.ts             NEW v2 record schemas + lenient v1 schema
apps/web/src/api/assemble.ts                 NEW record → DTO assembly
apps/web/src/api/search.ts                   NEW library search
apps/web/src/api/migrateV1.ts                NEW v1 → v2 migration
apps/web/src/api/seedData.ts                 rewritten for LIBRARY_FIXTURE → v2
apps/web/src/api/localDb.ts                  rewritten v2
apps/web/src/api/storage.ts                  + removeItem
apps/web/src/api/trickAPI.ts, techniqueAPI.ts (NEW), itemAPI.ts (NEW)
apps/web/src/store/useLibrary.ts, useTechnique.ts, useItem.ts (NEW)
apps/web/src/business/libraryBusiness.ts, techniqueBusiness.ts, itemBusiness.ts (NEW); trick/routine/noteBusiness updated
apps/web/src/utils/routine.ts, library.ts (NEW)
apps/web/src/constants/routes.ts, library.ts (NEW)
apps/web/src/components/SceneSvg (packet shapes), TrickCard, NavLinks, RoutineSwitcher, StaticPhaseViewer, UsageList (NEW); Sidebar, TopBar, TrickHero, TechniqueList updated
apps/web/src/contents/Library, TechniqueLibrary, TechniqueDetail, ItemLibrary, ItemDetail (NEW); TrickDetail updated; Home/HomeRedirect deleted
apps/web/src/routes/router.tsx
apps/web/e2e/trickDetail.e2e.ts (adapted), library.e2e.ts (NEW)
```

---

### Task 1: Packet actions in the shared ActionSchema

**Files:**
- Modify: `packages/shared/src/schemas/action.ts`
- Test: `packages/shared/src/schemas/action.test.ts` (append)

**Interfaces:**
- Produces: five new `TAction` members — `setupPackets { selection: { label }, count: 20..52 }`, `cutHalves {}`, `turnPacket { packet: "left" | "right", keepTop: boolean, covert: boolean }`, `riffle { mode: "stripOut" }`, `spreadReveal {}` — plus `PACKET_ACTION_TYPES` and `TPacketActionType`.

- [ ] **Step 1: Append the failing tests** to `packages/shared/src/schemas/action.test.ts`:

```ts
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
```

and change the import line at the top of the test file to:

```ts
import { ActionSchema, PACKET_ACTION_TYPES } from "./action";
```

- [ ] **Step 2: Run to verify failure**

Run: `bun test packages/shared/src/schemas/action.test.ts`
Expected: FAIL — `PACKET_ACTION_TYPES` is not exported / packet actions rejected.

- [ ] **Step 3: Implement.** In `packages/shared/src/schemas/action.ts`, append these five entries at the **end** of the `z.discriminatedUnion("type", [ … ])` array (after the `spread` entry):

```ts
  z.strictObject({
    type: z.literal("setupPackets"),
    params: z.strictObject({
      selection: z.strictObject({ label: z.string().min(1).max(8) }),
      count: z.number().int().min(20).max(52),
    }),
  }),
  z.strictObject({ type: z.literal("cutHalves"), params: EmptyParamsSchema }),
  z.strictObject({
    type: z.literal("turnPacket"),
    params: z.strictObject({
      packet: z.enum(["left", "right"]),
      keepTop: z.boolean(),
      covert: z.boolean(),
    }),
  }),
  z.strictObject({
    type: z.literal("riffle"),
    params: z.strictObject({ mode: z.literal("stripOut") }),
  }),
  z.strictObject({ type: z.literal("spreadReveal"), params: EmptyParamsSchema }),
```

and append at the end of the file:

```ts
export const PACKET_ACTION_TYPES = ["cutHalves", "turnPacket", "riffle", "spreadReveal"] as const;
export type TPacketActionType = (typeof PACKET_ACTION_TYPES)[number];
```

- [ ] **Step 4: Run tests**

Run: `bun test packages/shared`
Expected: PASS.

Note: `bun run typecheck` will now FAIL in `packages/engine/src/scene.ts` (the exhaustive `never` switch does not handle the new action types). That is expected and fixed in Task 2 — do not patch the engine in this task. Run `bun run --cwd packages/shared typecheck` (must pass) instead of the root typecheck.

- [ ] **Step 5: Leave changes uncommitted.**

---

### Task 2: Engine `packets` scene (types, reducer, projection, layout) + Triumph phases

**Files:**
- Modify: `packages/engine/src/types.ts`, `errors.ts`, `scene.ts`, `timeline.ts`, `project.ts`, `layout.ts`
- Create: `packages/engine/src/guards.ts`, `packages/engine/src/packets.ts`
- Create: `packages/shared/src/fixtures/triumph.ts`
- Modify tests (narrowing only): `packages/engine/src/scene.test.ts`, `timeline.test.ts`, `project.test.ts`
- Create tests: `packages/engine/src/packets.test.ts`, `packages/engine/src/packetLayout.test.ts`

**Interfaces:**
- Consumes: Task 1 packet actions; MVP1 engine.
- Produces:
  - `TScene = ISceneState | IPacketScene` (`ISceneState.kind = "deck"`, `IPacketScene.kind = "packets"`); `TProjectedScene = IProjectedScene | IProjectedPacketScene`
  - `applyAction(state: TScene, action: TAction): TScene`; `buildTimeline` frames hold `TScene`; `stateAt(): TScene`; `project(state: TScene, view): TProjectedScene`; `layout(scene: TProjectedScene): IRenderNode[]`
  - Node kinds `"packetBlock" | "mixedBlock"`, zone `"packet"`, highlight `"reversed"`; packet block ids `packet-main|packet-left|packet-right`, mixed block id `mixed-block`
  - Errors `WRONG_SCENE`, `NO_PACKET`
  - Guards `asDeckScene`, `asPacketScene`, `asDeckProjection`, `asPacketProjection` (throw on mismatch)
  - `TRIUMPH_VERNON_PHASES: IFixturePhase[]` (5 phases, 7 actions, `phaseEnds = [0, 2, 3, 4, 6]`)

- [ ] **Step 1: Create the Triumph phases fixture** `packages/shared/src/fixtures/triumph.ts`:

```ts
import type { IFixturePhase } from "./ambitiousCard";

// Vernon's Triumph, simplified (spec §3.4). The user verified this order.
export const TRIUMPH_VERNON_PHASES: IFixturePhase[] = [
  {
    name: "Selection",
    summary: "Card chosen",
    explanation: "The selection (4♠) is secretly controlled to the top of the deck.",
    spectatorText: "A card is chosen and lost in the deck.",
    techniques: [],
    actions: [
      {
        action: { type: "setupPackets", params: { selection: { label: "4S" }, count: 52 } },
        durationMs: 700,
      },
    ],
  },
  {
    name: "Cut & Turn",
    summary: "Half face up",
    explanation:
      "Cut the deck into halves. Turn the half holding the 4♠ face up — except the 4♠ itself, which stays face down, reversed within its half.",
    spectatorText: "The deck is cut and one half is turned face up.",
    techniques: ["Packet Turnover"],
    actions: [
      { action: { type: "cutHalves", params: {} }, durationMs: 700 },
      {
        action: { type: "turnPacket", params: { packet: "left", keepTop: true, covert: false } },
        durationMs: 800,
      },
    ],
  },
  {
    name: "The Shuffle",
    summary: "Apparently mixed",
    explanation: "A strip-out shuffle: the halves only look interlaced and stay separate.",
    spectatorText: "The face-up and face-down halves are shuffled together.",
    techniques: ["Riffle Shuffle", "Strip-Out Shuffle"],
    actions: [{ action: { type: "riffle", params: { mode: "stripOut" } }, durationMs: 1000 }],
  },
  {
    name: "Secret Correction",
    summary: "Nothing to see",
    explanation:
      "While squaring, secretly turn the face-up half over. Now every card faces down — except the 4♠.",
    spectatorText: "The deck is squared. Nothing seems to happen.",
    techniques: ["Packet Turnover"],
    actions: [
      {
        action: { type: "turnPacket", params: { packet: "left", keepTop: false, covert: true } },
        durationMs: 800,
      },
    ],
  },
  {
    name: "Triumph",
    summary: "Order restored",
    explanation:
      "Snap and spread: every card faces down except the 4♠ — the only reversed card since the cut.",
    spectatorText: "With a snap, every card rights itself — except the selection, face up.",
    techniques: ["Spread"],
    actions: [
      { action: { type: "snap", params: {} }, durationMs: 600 },
      { action: { type: "spreadReveal", params: {} }, durationMs: 900 },
    ],
  },
];
```

- [ ] **Step 2: Extend the engine types.** Replace `packages/engine/src/types.ts` with:

```ts
import type { TAction } from "@sleightbook/shared/schemas/action";

export type TFace = "up" | "down";
export type TView = "spectator" | "secret";

export interface ICard {
  id: string;
  label: string;
  face: TFace;
  perceivedAs: string | null;
}

export interface ILifted {
  cardIds: string[];
  asOne: boolean;
}

export interface ISceneState {
  kind: "deck";
  cards: Record<string, ICard>;
  deck: string[];
  restCount: number;
  lifted: ILifted | null;
  hand: string[];
  buried: string[];
  jogged: string | null;
  spread: boolean;
  beat: boolean;
}

export type TPacketId = "main" | "left" | "right";

export interface IPacket {
  id: TPacketId;
  count: number;
  face: TFace;
  perceivedFace: TFace;
  namedIds: string[];
}

export interface IPacketScene {
  kind: "packets";
  cards: Record<string, ICard>;
  packets: IPacket[];
  stacked: boolean;
  perceivedMixed: boolean;
  spread: boolean;
  beat: boolean;
}

export type TScene = ISceneState | IPacketScene;

export interface IPhaseInput {
  actions: ReadonlyArray<{ action: TAction; durationMs: number }>;
}

export interface IFrame {
  phaseIndex: number;
  actionIndex: number;
  state: TScene;
  durationMs: number;
}

export interface ITimeline {
  initial: TScene;
  frames: IFrame[];
  phaseEnds: number[];
}

export interface IProjectedCard {
  id: string;
  label: string;
  face: TFace;
  perceivedLabel: string | null;
}

export interface IProjectedScene {
  kind: "deck";
  view: TView;
  deck: IProjectedCard[];
  restCount: number;
  lifted: { cards: IProjectedCard[]; asOne: boolean } | null;
  hand: IProjectedCard[];
  buried: IProjectedCard[];
  joggedId: string | null;
  spread: boolean;
  beat: boolean;
}

export interface IProjectedPacket {
  id: TPacketId;
  count: number;
  face: TFace;
  cards: IProjectedCard[];
}

export interface IProjectedPacketScene {
  kind: "packets";
  view: TView;
  packets: IProjectedPacket[];
  stacked: boolean;
  showMixed: boolean;
  spread: boolean;
  beat: boolean;
}

export type TProjectedScene = IProjectedScene | IProjectedPacketScene;

export type TNodeKind = "card" | "deckBlock" | "fanCard" | "packetBlock" | "mixedBlock";
export type TNodeZone = "deck" | "lifted" | "hand" | "buried" | "fan" | "block" | "packet";
export type THighlight = "none" | "perceived" | "jogged" | "reversed";

export interface IRenderNode {
  id: string;
  kind: TNodeKind;
  zone: TNodeZone;
  x: number;
  y: number;
  rotation: number;
  z: number;
  face: TFace;
  label: string;
  perceivedLabel: string | null;
  highlight: THighlight;
}
```

In `packages/engine/src/errors.ts` add two members to `TEngineErrorCode`: `| "WRONG_SCENE"` and `| "NO_PACKET"`.

Create `packages/engine/src/guards.ts`:

```ts
import type {
  IPacketScene,
  IProjectedPacketScene,
  IProjectedScene,
  ISceneState,
  TProjectedScene,
  TScene,
} from "./types";

export const asDeckScene = (scene: TScene | undefined): ISceneState => {
  if (!scene || scene.kind !== "deck") {
    throw new Error(`Expected a deck scene, got ${scene?.kind ?? "nothing"}`);
  }
  return scene;
};

export const asPacketScene = (scene: TScene | undefined): IPacketScene => {
  if (!scene || scene.kind !== "packets") {
    throw new Error(`Expected a packet scene, got ${scene?.kind ?? "nothing"}`);
  }
  return scene;
};

export const asDeckProjection = (scene: TProjectedScene): IProjectedScene => {
  if (scene.kind !== "deck") throw new Error(`Expected a deck projection, got ${scene.kind}`);
  return scene;
};

export const asPacketProjection = (scene: TProjectedScene): IProjectedPacketScene => {
  if (scene.kind !== "packets") throw new Error(`Expected a packet projection, got ${scene.kind}`);
  return scene;
};
```

- [ ] **Step 3: Write the failing reducer/timeline tests** `packages/engine/src/packets.test.ts`:

```ts
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
  asPacketScene(actions.reduce<TScene>((state, action) => applyAction(state, action), createEmptyScene()));

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
    const odd = run({ type: "setupPackets", params: { selection: { label: "4S" }, count: 25 } }, CUT);
    expect(odd.packets.map((packet) => packet.count)).toEqual([13, 12]);
    expect(odd.stacked).toBe(false);
  });

  test("turnPacket with keepTop flips the packet but not its top named card", () => {
    const state = run(SETUP, CUT, TURN_LEFT_KEEP);
    expect(state.packets[0]).toMatchObject({ id: "left", face: "up", perceivedFace: "up", namedIds: ["c1"] });
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
    const state = run(SETUP, CUT, TURN_LEFT_KEEP, RIFFLE, CORRECT, { type: "spreadReveal", params: {} });
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
    expect(errorCodeOf(() => run(SETUP, { type: "doubleLift", params: { count: 2 } }))).toBe("WRONG_SCENE");
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
```

Run: `bun test packages/engine/src/packets.test.ts` → Expected: FAIL (`./guards` / packet reducer missing or `setupPackets` not handled).

- [ ] **Step 4: Implement the packet reducer.** Create `packages/engine/src/packets.ts`:

```ts
import type { TAction } from "@sleightbook/shared/schemas/action";

import { EngineError } from "./errors";
import type { ICard, IPacket, IPacketScene, TFace, TPacketId } from "./types";

type TSetupPacketsParams = Extract<TAction, { type: "setupPackets" }>["params"];
export type TStepAction = Exclude<TAction, { type: "setupDeck" | "setupPackets" }>;

const flipFace = (face: TFace): TFace => (face === "up" ? "down" : "up");

export const setupPackets = (params: TSetupPacketsParams): IPacketScene => ({
  kind: "packets",
  cards: { c1: { id: "c1", label: params.selection.label, face: "down", perceivedAs: null } },
  packets: [{ id: "main", count: params.count, face: "down", perceivedFace: "down", namedIds: ["c1"] }],
  stacked: true,
  perceivedMixed: false,
  spread: false,
  beat: false,
});

const findPacket = (state: IPacketScene, id: TPacketId): IPacket => {
  const packet = state.packets.find((candidate) => candidate.id === id);
  if (!packet) throw new EngineError("NO_PACKET", `No packet "${id}" on the table`);
  return packet;
};

const replacePacket = (packets: IPacket[], updated: IPacket): IPacket[] =>
  packets.map((packet) => (packet.id === updated.id ? updated : packet));

export const applyPacketAction = (state: IPacketScene, action: TStepAction): IPacketScene => {
  const next: IPacketScene = { ...state, beat: false };

  switch (action.type) {
    case "cutHalves": {
      const main = findPacket(state, "main");
      const leftCount = Math.ceil(main.count / 2);
      return {
        ...next,
        stacked: false,
        packets: [
          { ...main, id: "left", count: leftCount },
          {
            id: "right",
            count: main.count - leftCount,
            face: main.face,
            perceivedFace: main.perceivedFace,
            namedIds: [],
          },
        ],
      };
    }
    case "turnPacket": {
      const packet = findPacket(state, action.params.packet);
      const [top, ...rest] = packet.namedIds;
      const keptTop = action.params.keepTop ? top : undefined;
      const flipping = keptTop === undefined ? packet.namedIds : rest;
      const cards: Record<string, ICard> = { ...state.cards };
      for (const id of flipping) {
        cards[id] = { ...cards[id], face: flipFace(cards[id].face) };
      }
      const reversed = [...flipping].reverse();
      const face = flipFace(packet.face);
      return {
        ...next,
        cards,
        packets: replacePacket(state.packets, {
          ...packet,
          face,
          perceivedFace: action.params.covert ? packet.perceivedFace : face,
          namedIds: keptTop === undefined ? reversed : [keptTop, ...reversed],
        }),
      };
    }
    case "riffle": {
      const left = findPacket(state, "left");
      const right = findPacket(state, "right");
      return { ...next, stacked: true, perceivedMixed: true, packets: [right, left] };
    }
    case "spreadReveal":
      return {
        ...next,
        spread: true,
        perceivedMixed: false,
        packets: state.packets.map((packet) => ({ ...packet, perceivedFace: packet.face })),
      };
    case "snap":
      return { ...next, beat: true };
    default:
      throw new EngineError("WRONG_SCENE", `"${action.type}" is not available for packet tricks`);
  }
};
```

Modify `packages/engine/src/scene.ts`:
1. `createEmptyScene` returns `{ kind: "deck", cards: {}, … }` (add `kind: "deck"` as the first property).
2. Replace the imports with:
   ```ts
   import type { TAction } from "@sleightbook/shared/schemas/action";

   import { EngineError } from "./errors";
   import { applyPacketAction, setupPackets, type TStepAction } from "./packets";
   import type { ICard, ISceneState, TFace, TScene } from "./types";
   ```
3. Rename the current `applyAction` body into `const applyDeckAction = (state: ISceneState, action: TStepAction): ISceneState => { … }` — remove its first two `if` statements (setup and NOT_SETUP checks move to the dispatcher) and add, **before** the `default:` case of its switch:
   ```ts
       case "cutHalves":
       case "turnPacket":
       case "riffle":
       case "spreadReveal":
         throw new EngineError("WRONG_SCENE", `"${action.type}" is only available for packet tricks`);
   ```
4. Add the exported dispatcher:
   ```ts
   export const applyAction = (state: TScene, action: TAction): TScene => {
     if (action.type === "setupDeck") return setupDeck(action.params);
     if (action.type === "setupPackets") return setupPackets(action.params);
     if (Object.keys(state.cards).length === 0) {
       throw new EngineError("NOT_SETUP", `"${action.type}" requires a setup action first`);
     }
     return state.kind === "packets" ? applyPacketAction(state, action) : applyDeckAction(state, action);
   };
   ```

Modify `packages/engine/src/timeline.ts`: import `TScene` instead of `ISceneState`; `let state: TScene = initial;`; `stateAt` returns `TScene`.

- [ ] **Step 5: Keep the MVP1 engine tests compiling (narrowing only).**
- `scene.test.ts`: import `asDeckScene` from `./guards` and `TScene` type; change `run` to
  `asDeckScene(actions.reduce<TScene>((state, action) => applyAction(state, action), createEmptyScene()))`;
  wrap every other `applyAction(…)` result whose deck-only fields (`hand`, `buried`, `jogged`, `deck`, `lifted`, `cards`) are read in `asDeckScene(…)`. `.beat`/`.spread` reads need no wrapper. Do not change any expected value.
- `timeline.test.ts`: wrap `timeline.frames[n]?.state` and `stateAt(…)` in `asDeckScene(…)` wherever deck-only fields are read (keep the `toBe(timeline.initial)` / `toBe(timeline.frames[…]?.state)` identity assertions unwrapped).
- `project.test.ts`: import `asDeckProjection` and wrap each `project(…)` whose deck fields are read.

Run: `bun test packages/engine` → Expected: MVP1 tests + packet reducer tests PASS (projection/layout packet tests come next).

- [ ] **Step 6: Write the failing projection & layout tests** `packages/engine/src/packetLayout.test.ts`:

```ts
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
    expect(asPacketProjection(project(stateAt(timeline, 2), "spectator")).packets.map((p) => p.cards)).toEqual([
      [],
      [],
    ]);
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
    expect(byId(secret, "c1")).toMatchObject({ zone: "packet", x: 174, y: 112, z: 11, face: "down", highlight: "none" });
    expect(nodesAt(0, "spectator").map((node) => node.id)).toEqual(["packet-main"]);
  });

  test("cut & turn: halves side by side, selection reversed in the face-up half", () => {
    const nodes = nodesAt(2, "secret");
    expect(byId(nodes, "packet-left")).toMatchObject({ x: 89, y: 110, z: 10, face: "up" });
    expect(byId(nodes, "packet-right")).toMatchObject({ x: 199, y: 110, z: 20, face: "down" });
    expect(byId(nodes, "c1")).toMatchObject({ x: 119, y: 112, z: 11, face: "down", highlight: "reversed" });
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
```

Run: `bun test packages/engine/src/packetLayout.test.ts` → Expected: FAIL.

- [ ] **Step 7: Implement projection & layout dispatch.**

`packages/engine/src/project.ts`:
- imports: add `IPacketScene`, `IProjectedPacketScene`, `TProjectedScene`, `TScene` types.
- rename the current exported `project` to `const projectDeck = (state: ISceneState, view: TView): IProjectedScene` and add `kind: "deck",` as the first property of its returned object.
- add:

```ts
const projectPackets = (state: IPacketScene, view: TView): IProjectedPacketScene => {
  const isSecret = view === "secret";
  return {
    kind: "packets",
    view,
    stacked: state.stacked,
    showMixed: !isSecret && state.stacked && state.perceivedMixed,
    spread: state.spread,
    beat: state.beat,
    packets: state.packets.map((packet) => ({
      id: packet.id,
      count: packet.count,
      face: isSecret ? packet.face : packet.perceivedFace,
      cards:
        isSecret || state.spread
          ? packet.namedIds.map((id) => toProjectedCard(state.cards[id], view))
          : [],
    })),
  };
};

export const project = (state: TScene, view: TView): TProjectedScene =>
  state.kind === "packets" ? projectPackets(state, view) : projectDeck(state, view);
```

`packages/engine/src/layout.ts`:
- imports: add `IProjectedPacketScene`, `TProjectedScene`, `TFace`, `TNodeKind` types (keep existing).
- rename the current exported `layout` to `const layoutDeck = (scene: IProjectedScene): IRenderNode[]` (import `IProjectedScene` type if not already).
- add constants and functions:

```ts
const PACKET_GAP = 110;
const STACK_STEP = 8;
const NAMED_OFFSET = 30;

const blockNode = (id: string, kind: TNodeKind, face: TFace, x: number, y: number, z: number): IRenderNode => ({
  id,
  kind,
  zone: "packet",
  x: round2(x),
  y: round2(y),
  rotation: 0,
  z,
  face,
  label: "",
  perceivedLabel: null,
  highlight: "none",
});

const layoutPackets = (scene: IProjectedPacketScene): IRenderNode[] => {
  const nodes: IRenderNode[] = [];

  if (scene.spread) {
    const named = scene.packets.flatMap((packet) => packet.cards);
    const total = FAN_SIZE + named.length;
    const middle = Math.floor(total / 2);
    let anonymous = 0;
    for (let p = 0; p < total; p += 1) {
      const position = fanPosition(p, total);
      const card = p >= middle ? named[p - middle] : undefined;
      if (card) {
        nodes.push(cardNode(card, "fan", position, null));
      } else {
        nodes.push({
          id: `fan-${anonymous}`,
          kind: "fanCard",
          zone: "fan",
          x: round2(position.x),
          y: round2(position.y),
          rotation: round2(position.rotation),
          z: position.z,
          face: "down",
          label: "",
          perceivedLabel: null,
          highlight: "none",
        });
        anonymous += 1;
      }
    }
    return nodes.sort((a, b) => a.z - b.z);
  }

  if (scene.showMixed) return [blockNode("mixed-block", "mixedBlock", "down", DECK_X, DECK_Y, 1)];

  const count = scene.packets.length;
  scene.packets.forEach((packet, index) => {
    const x = scene.stacked ? DECK_X : DECK_X + (index - (count - 1) / 2) * PACKET_GAP;
    const y = scene.stacked ? DECK_Y - STACK_STEP * (count - 1 - index) : DECK_Y;
    const z = scene.stacked ? 10 * (count - index) : 10 * (index + 1);
    nodes.push(blockNode(`packet-${packet.id}`, "packetBlock", packet.face, x, y, z));
    packet.cards.forEach((card, cardIndex) => {
      const node = cardNode(
        card,
        "packet",
        { x: x + NAMED_OFFSET, y: y + 2 + 4 * cardIndex, rotation: 0, z: z + 1 + cardIndex },
        null,
      );
      nodes.push({ ...node, highlight: card.face === packet.face ? "none" : "reversed" });
    });
  });
  return nodes.sort((a, b) => a.z - b.z);
};

export const layout = (scene: TProjectedScene): IRenderNode[] =>
  scene.kind === "packets" ? layoutPackets(scene) : layoutDeck(scene);
```

(Packet placement rules — locked by the tests above: single/stacked packets centre at `x = 144`; stacked packet `i` of `n` at `y = 110 − 8·(n−1−i)`, `z = 10·(n−i)`; side-by-side packet `i` at `x = 144 + (i − (n−1)/2)·110`, `y = 110`, `z = 10·(i+1)`; named cards at `x + 30`, `y + 2 + 4·k`, `z + 1 + k`; spread fan uses the MVP1 fan formula with named cards starting at `floor(total/2)`.)

- [ ] **Step 8: Run & verify**

Run:

```bash
bun test packages/engine
bunx biome check --write packages
bun run typecheck
bun run --cwd apps/web test
```

Expected: all engine tests (MVP1 + packets + packet layout) pass; root typecheck passes (apps/web compiles because `Visualizer` only uses `project`, `layout`, `stateAt` and `scene.beat`); web tests pass.

- [ ] **Step 9: Leave changes uncommitted.**

---

### Task 3: Library fixture & new shared schemas

**Files:**
- Create: `packages/shared/src/fixtures/library.ts`, `packages/shared/src/fixtures/library.test.ts`
- Create: `packages/shared/src/schemas/usage.ts`, `technique.ts`, `item.ts`
- Modify: `packages/shared/src/schemas/trick.ts` (add only — no breaking change in this task)
- Test: `packages/shared/src/schemas/library.test.ts`
- Create: `packages/engine/src/library.test.ts` (validates visual routines with the engine)

**Interfaces:**
- Consumes: `AMBITIOUS_CARD` (MVP1), `TRIUMPH_VERNON_PHASES` (Task 2), `IFixturePhase`/`IFixtureTechnique`/`IFixtureItem`/`ITrickFixture`.
- Produces:
  - `ILibraryFixture`, `ILibraryRoutineFixture`, `ILibraryTrickFixture`, `LIBRARY_FIXTURE` (12 techniques, 6 items, 6 tricks; Ambitious Card has 3 routines: Standard ★🎬, Elmsley Version, Top Change Version; Triumph "Vernon" ★🎬)
  - `TrickCardSchema`/`ITrickCard`, `LIBRARY_CATEGORIES`/`TLibraryCategory`, `LibraryQuerySchema`, `ILibraryQuery` (= `z.input`), `IResolvedLibraryQuery` (= `z.output`)
  - `UsageSchema`/`IUsage`, `TechniqueSummarySchema`/`ITechniqueSummary`, `TechniqueDetailSchema`/`ITechniqueDetail`, `ItemSummarySchema`/`IItemSummary`, `ItemDetailSchema`/`IItemDetail`

- [ ] **Step 1: Write the failing tests.**

`packages/shared/src/fixtures/library.test.ts`:

```ts
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
```

`packages/shared/src/schemas/library.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { ItemDetailSchema } from "./item";
import { TechniqueDetailSchema } from "./technique";
import { LibraryQuerySchema, TrickCardSchema } from "./trick";

const ID = "00000000-0000-4000-8000-000000000001";

describe("LibraryQuerySchema", () => {
  test("fills defaults", () => {
    expect(LibraryQuerySchema.parse({})).toEqual({ q: "", category: "all", favoritesOnly: false });
  });

  test("rejects unknown categories", () => {
    expect(LibraryQuerySchema.safeParse({ category: "cards" }).success).toBe(false);
  });
});

describe("DTO schemas", () => {
  test("TrickCardSchema", () => {
    const card = {
      id: ID,
      name: "Triumph",
      slug: "triumph",
      category: "card",
      difficulty: "intermediate",
      isFavorite: false,
      description: "",
      durationMin: 4,
      durationMax: 6,
      phaseCount: 5,
      techniqueNames: ["Packet Turnover"],
      hasVisualization: true,
    };
    expect(TrickCardSchema.parse(card).phaseCount).toBe(5);
  });

  test("TechniqueDetailSchema and ItemDetailSchema carry usages and notes", () => {
    const usage = { trickId: ID, trickName: "Triumph", routineId: ID, routineName: "Vernon", phaseNames: ["Cut & Turn"] };
    expect(
      TechniqueDetailSchema.parse({
        id: ID,
        name: "Packet Turnover",
        description: "",
        difficulty: "intermediate",
        category: "Control",
        tips: [],
        commonMistakes: [],
        usedIn: [usage],
        notes: [],
      }).usedIn,
    ).toHaveLength(1);
    expect(
      ItemDetailSchema.parse({
        id: ID,
        kind: "prop",
        name: "Deck of cards",
        description: "",
        setupNotes: "",
        usedIn: [{ ...usage, phaseNames: [] }],
        notes: [],
      }).kind,
    ).toBe("prop");
  });
});
```

`packages/engine/src/library.test.ts`:

```ts
import { expect, test } from "bun:test";

import { LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";

import { validateRoutine } from "./timeline";

test("every visual routine in the library is a valid engine timeline", () => {
  const visual = LIBRARY_FIXTURE.tricks.flatMap((entry) =>
    entry.routines
      .filter((routine) => routine.phases.every((phase) => phase.actions.length > 0))
      .map((routine) => ({ name: `${entry.trick.name} / ${routine.name}`, phases: routine.phases })),
  );
  expect(visual.map((routine) => routine.name)).toEqual(["Ambitious Card / Standard", "Triumph / Vernon"]);
  for (const routine of visual) {
    expect(validateRoutine(routine.phases)).toEqual({ ok: true });
  }
});
```

Run: `bun test packages/shared packages/engine/src/library.test.ts` → Expected: FAIL (modules missing).

- [ ] **Step 2: Add the schemas.**

Append to `packages/shared/src/schemas/trick.ts`:

```ts
export const TrickCardSchema = TrickSummarySchema.extend({
  description: z.string(),
  durationMin: z.number().int(),
  durationMax: z.number().int(),
  phaseCount: z.number().int(),
  techniqueNames: z.array(z.string()),
  hasVisualization: z.boolean(),
});
export type ITrickCard = z.infer<typeof TrickCardSchema>;

export const LIBRARY_CATEGORIES = ["all", ...CATEGORIES] as const;
export type TLibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export const LibraryQuerySchema = z.object({
  q: z.string().max(200).default(""),
  category: z.enum(LIBRARY_CATEGORIES).default("all"),
  favoritesOnly: z.boolean().default(false),
});
export type ILibraryQuery = z.input<typeof LibraryQuerySchema>;
export type IResolvedLibraryQuery = z.output<typeof LibraryQuerySchema>;
```

`packages/shared/src/schemas/usage.ts`:

```ts
import { z } from "zod";

export const UsageSchema = z.object({
  trickId: z.uuid(),
  trickName: z.string(),
  routineId: z.uuid(),
  routineName: z.string(),
  phaseNames: z.array(z.string()),
});
export type IUsage = z.infer<typeof UsageSchema>;
```

`packages/shared/src/schemas/technique.ts`:

```ts
import { z } from "zod";

import { NoteSchema } from "./note";
import { TechniqueSchema } from "./routine";
import { UsageSchema } from "./usage";

export const TechniqueSummarySchema = TechniqueSchema.pick({
  id: true,
  name: true,
  category: true,
  difficulty: true,
}).extend({ usageCount: z.number().int() });
export type ITechniqueSummary = z.infer<typeof TechniqueSummarySchema>;

export const TechniqueDetailSchema = TechniqueSchema.extend({
  usedIn: z.array(UsageSchema),
  notes: z.array(NoteSchema),
});
export type ITechniqueDetail = z.infer<typeof TechniqueDetailSchema>;
```

`packages/shared/src/schemas/item.ts`:

```ts
import { z } from "zod";

import { NoteSchema } from "./note";
import { ItemSchema } from "./trick";
import { UsageSchema } from "./usage";

export const ItemSummarySchema = ItemSchema.extend({ usageCount: z.number().int() });
export type IItemSummary = z.infer<typeof ItemSummarySchema>;

export const ItemDetailSchema = ItemSchema.extend({
  usedIn: z.array(UsageSchema),
  notes: z.array(NoteSchema),
});
export type IItemDetail = z.infer<typeof ItemDetailSchema>;
```

- [ ] **Step 3: Create the library fixture** `packages/shared/src/fixtures/library.ts`:

```ts
import {
  AMBITIOUS_CARD,
  type IFixtureItem,
  type IFixturePhase,
  type IFixtureTechnique,
  type ITrickFixture,
} from "./ambitiousCard";
import { TRIUMPH_VERNON_PHASES } from "./triumph";

export interface ILibraryRoutineFixture {
  name: string;
  description: string;
  tips: string[];
  isDefault: boolean;
  items: string[];
  phases: IFixturePhase[];
}

export interface ILibraryTrickFixture {
  trick: ITrickFixture["trick"];
  note: string | null;
  routines: ILibraryRoutineFixture[];
}

export interface ILibraryFixture {
  techniques: IFixtureTechnique[];
  items: IFixtureItem[];
  tricks: ILibraryTrickFixture[];
}

const textPhase = (
  name: string,
  summary: string,
  explanation: string,
  spectatorText: string,
  techniques: string[] = [],
): IFixturePhase => ({ name, summary, explanation, spectatorText, techniques, actions: [] });

const TECHNIQUES: IFixtureTechnique[] = [
  ...AMBITIOUS_CARD.techniques,
  {
    name: "Elmsley Count",
    description: "Count four cards while secretly hiding one of them.",
    difficulty: "intermediate",
    category: "Count",
    tips: ["Keep the rhythm identical for every card."],
    commonMistakes: ["Flashing the hidden card on the third count."],
  },
  {
    name: "Top Change",
    description: "Switch the card in your hand for the top card of the deck during a natural gesture.",
    difficulty: "advanced",
    category: "Switch",
    tips: ["Motivate the move with a gesture toward the spectator."],
    commonMistakes: ["Looking at your hands during the switch."],
  },
  {
    name: "Riffle Shuffle",
    description: "Interlace two halves of the deck.",
    difficulty: "beginner",
    category: "Shuffle",
    tips: ["Keep the halves low and relaxed."],
    commonMistakes: ["Letting cards fly out of the riffle."],
  },
  {
    name: "Strip-Out Shuffle",
    description: "A false shuffle: the halves look interlaced but are stripped back apart.",
    difficulty: "advanced",
    category: "False Shuffle",
    tips: ["Strip out cleanly in one motion."],
    commonMistakes: ["Pausing before the strip-out."],
  },
  {
    name: "Packet Turnover",
    description: "Turn a packet over while controlling which cards actually reverse.",
    difficulty: "intermediate",
    category: "Control",
    tips: ["Cover the turnover with the squaring action."],
    commonMistakes: ["Exposing the edge of the reversed card."],
  },
  {
    name: "Classic Force",
    description: "Make a spectator take a predetermined card while the choice feels free.",
    difficulty: "advanced",
    category: "Force",
    tips: ["Time the spread to the spectator's reach."],
    commonMistakes: ["Spreading so slowly that the force looks deliberate."],
  },
  {
    name: "Coin Retention Vanish",
    description: "Apparently place a coin in the other hand while retaining it.",
    difficulty: "intermediate",
    category: "Vanish",
    tips: ["Follow the invisible coin with your eyes."],
    commonMistakes: ["Tensing the retaining hand."],
  },
  {
    name: "Thread Rise",
    description: "Use an invisible thread to make a card rise from the deck.",
    difficulty: "intermediate",
    category: "Gimmick",
    tips: ["Keep the thread taut before the rise."],
    commonMistakes: ["Performing against a busy background."],
  },
];

const ITEMS: IFixtureItem[] = [
  ...AMBITIOUS_CARD.items,
  { kind: "prop", name: "Four coins", description: "Four matching coins.", setupNotes: "Keep them together in one pocket." },
  { kind: "prop", name: "Four playing cards", description: "Four cards used as covers.", setupNotes: "" },
  { kind: "prop", name: "Close-up mat", description: "A soft surface for card and coin work.", setupNotes: "" },
  {
    kind: "prop",
    name: "Prediction envelope",
    description: "A sealed envelope holding the prediction.",
    setupNotes: "Write the force card before the show and seal it.",
  },
  {
    kind: "gimmick",
    name: "Invisible thread",
    description: "Fine thread attached to the deck for the rise.",
    setupNotes: "Attach the thread before performing and test the tension.",
  },
];

export const LIBRARY_FIXTURE: ILibraryFixture = {
  techniques: TECHNIQUES,
  items: ITEMS,
  tricks: [
    {
      trick: AMBITIOUS_CARD.trick,
      note: AMBITIOUS_CARD.trickNote,
      routines: [
        {
          name: AMBITIOUS_CARD.routine.name,
          description: AMBITIOUS_CARD.routine.description,
          tips: AMBITIOUS_CARD.routine.tips,
          isDefault: true,
          items: ["Deck of cards"],
          phases: AMBITIOUS_CARD.phases,
        },
        {
          name: "Elmsley Version",
          description: "The card rises inside a small packet, using an Elmsley count to hide it.",
          tips: ["Keep the count rhythm steady."],
          isDefault: false,
          items: ["Deck of cards"],
          phases: [
            textPhase(
              "Setup",
              "Prepare the packet",
              "Deal four cards from the top; the selection is secretly among them.",
              "Four cards are taken from the deck.",
            ),
            textPhase(
              "Elmsley Count",
              "Hidden card",
              "Count the packet as four cards while hiding the selection.",
              "The four cards are shown; the selection is not among them.",
              ["Elmsley Count"],
            ),
            textPhase(
              "Reveal",
              "Card on top",
              "Turn over the top card of the packet: it is the selection.",
              "The selection is back on top.",
            ),
          ],
        },
        {
          name: "Top Change Version",
          description: "The card jumps back to the top through a top change.",
          tips: ["Make the switch during a natural gesture."],
          isDefault: false,
          items: ["Deck of cards"],
          phases: [
            textPhase("Show", "Card on top", "Show the selection on top with a double lift.", "The selection is shown on top.", [
              "Double Lift",
            ]),
            textPhase(
              "Top Change",
              "The switch",
              "While gesturing, switch the card in your hand for the top card of the deck.",
              "The selection is held away from the deck.",
              ["Top Change"],
            ),
            textPhase(
              "Reveal",
              "Card is back",
              "Turn over the top card: the selection is back.",
              "The selection has jumped back to the top.",
            ),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Triumph",
        slug: "triumph",
        description:
          "Face-up and face-down cards are shuffled together, yet with a snap every card rights itself — except the selection.",
        category: "card",
        difficulty: "intermediate",
        durationMin: 4,
        durationMax: 6,
      },
      note: null,
      routines: [
        {
          name: "Vernon",
          description: "Dai Vernon's classic handling with a strip-out shuffle.",
          tips: ["Let the mix look genuinely messy.", "Square the deck slowly during the correction."],
          isDefault: true,
          items: ["Deck of cards", "Close-up mat"],
          phases: TRIUMPH_VERNON_PHASES,
        },
      ],
    },
    {
      trick: {
        name: "Oil & Water",
        slug: "oil-and-water",
        description: "Red and black cards are mixed, yet they keep separating like oil and water.",
        category: "card",
        difficulty: "advanced",
        durationMin: 3,
        durationMax: 5,
      },
      note: null,
      routines: [
        {
          name: "Standard",
          description: "Six cards, three red and three black, separate three times.",
          tips: ["Slow down the final separation."],
          isDefault: true,
          items: ["Deck of cards"],
          phases: [
            textPhase("Display", "Alternate colors", "Show three red and three black cards alternated.", "Red and black cards are mixed."),
            textPhase(
              "Elmsley Count",
              "Hidden order",
              "Use Elmsley counts to show alternating colors while the packet is already separated.",
              "The cards are still alternating.",
              ["Elmsley Count"],
            ),
            textPhase("Separation", "Colors separate", "Spread the packet: reds and blacks have separated.", "The colors separate on their own.", [
              "Spread",
            ]),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Coin Matrix",
        slug: "coin-matrix",
        description: "Four coins under four cards gather one by one under a single card.",
        category: "coin",
        difficulty: "advanced",
        durationMin: 4,
        durationMax: 6,
      },
      note: null,
      routines: [
        {
          name: "Standard",
          description: "Classic four-coin matrix on a close-up mat.",
          tips: ["Keep the rhythm of lifting and covering identical."],
          isDefault: true,
          items: ["Four coins", "Four playing cards", "Close-up mat"],
          phases: [
            textPhase("Setup", "Four corners", "Place a coin at each corner of the mat and cover each with a card.", "Four coins, four cards."),
            textPhase(
              "First Travel",
              "One coin moves",
              "While lifting a card, retain one coin and load it under the target card.",
              "A coin vanishes and joins another.",
              ["Coin Retention Vanish"],
            ),
            textPhase("Gathering", "Coins gather", "Repeat the load for the remaining coins.", "One by one the coins gather under one card.", [
              "Coin Retention Vanish",
            ]),
            textPhase("Reveal", "All together", "Lift the last card to show all four coins.", "All four coins are together."),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Thought Card",
        slug: "thought-card",
        description: "A freely chosen card matches a prediction made before the performance.",
        category: "mentalism",
        difficulty: "intermediate",
        durationMin: 3,
        durationMax: 5,
      },
      note: null,
      routines: [
        {
          name: "Classic Force & Prediction",
          description: "A sealed prediction and a classic force.",
          tips: ["Place the envelope in view before the force."],
          isDefault: true,
          items: ["Deck of cards", "Prediction envelope"],
          phases: [
            textPhase("Prediction", "Sealed envelope", "Place the envelope holding the prediction in view.", "A prediction is set aside."),
            textPhase("Force", "Free choice", "Classic force the predicted card.", "The spectator freely takes a card.", ["Classic Force"]),
            textPhase("Reveal", "It matches", "Open the envelope: the prediction matches.", "The prediction matches the chosen card."),
          ],
        },
      ],
    },
    {
      trick: {
        name: "Rising Card",
        slug: "rising-card",
        description: "The chosen card rises out of the deck on command.",
        category: "gimmick",
        difficulty: "intermediate",
        durationMin: 2,
        durationMax: 4,
      },
      note: null,
      routines: [
        {
          name: "Thread Rise",
          description: "An invisible thread lifts the selection.",
          tips: ["Perform against a plain background."],
          isDefault: true,
          items: ["Deck of cards", "Invisible thread"],
          phases: [
            textPhase(
              "Setup",
              "Rigged deck",
              "The thread is attached; control the selection to the threaded position.",
              "A card is chosen and returned.",
            ),
            textPhase("Rise", "On command", "Move the hand slightly to tension the thread; the card rises.", "The card rises by itself.", [
              "Thread Rise",
            ]),
            textPhase("Clean Up", "Nothing to see", "Remove the card and ditch the thread.", "The card is handed out for examination."),
          ],
        },
      ],
    },
  ],
};
```

- [ ] **Step 4: Run tests**

Run: `bun test packages/shared packages/engine` → Expected: PASS.
Run: `bunx biome check --write packages && bun run typecheck` → Expected: exit 0.

- [ ] **Step 5: Leave changes uncommitted.**

---

### Task 4: Player store — static (text-only) routines

**Files:**
- Modify: `apps/web/src/store/usePlayer.ts`
- Test: `apps/web/src/store/usePlayer.test.ts` (append)

**Interfaces:**
- Produces: `IPlayerState.phaseCount` (initial `0`); `loadStatic(phaseCount: number)`; `goToPhase`/`next`/`prev` work without a timeline (no animation); `load(timeline)` also sets `phaseCount = timeline.phaseEnds.length`. MVP1 semantics for timelines are unchanged.

- [ ] **Step 1: Append failing tests** to `apps/web/src/store/usePlayer.test.ts`:

```ts
describe("usePlayerStore — static routines", () => {
  beforeEach(() => {
    usePlayerStore.setState({ ...INITIAL_PLAYER_STATE });
    usePlayerStore.getState().loadStatic(3);
  });

  test("loadStatic resets to the first phase without a timeline", () => {
    expect(usePlayerStore.getState()).toMatchObject({
      timeline: null,
      phaseCount: 3,
      phaseIndex: 0,
      isPlaying: false,
    });
  });

  test("navigation works and clamps", () => {
    const player = usePlayerStore.getState;
    player().goToPhase(5);
    expect(player().phaseIndex).toBe(2);
    player().next();
    expect(player().phaseIndex).toBe(2);
    player().prev();
    expect(player().phaseIndex).toBe(1);
    player().goToPhase(-3);
    expect(player().phaseIndex).toBe(0);
    player().prev();
    expect(player().phaseIndex).toBe(0);
  });

  test("play and tick are no-ops", () => {
    usePlayerStore.getState().play();
    usePlayerStore.getState().tick();
    expect(usePlayerStore.getState()).toMatchObject({ isPlaying: false, phaseIndex: 0 });
  });

  test("load(timeline) records the phase count", () => {
    usePlayerStore.getState().load(timeline);
    expect(usePlayerStore.getState().phaseCount).toBe(5);
  });
});
```

(`timeline`, `INITIAL_PLAYER_STATE`, `usePlayerStore`, `beforeEach`, `describe` are already imported/declared at the top of this file.)

Run: `bun run --cwd apps/web test src/store/usePlayer.test.ts` → Expected: FAIL (`loadStatic` missing).

- [ ] **Step 2: Implement** in `apps/web/src/store/usePlayer.ts`:
1. `IPlayerState`: add `phaseCount: number;`. `INITIAL_PLAYER_STATE`: add `phaseCount: 0,`.
2. `IPlayerStore`: add `loadStatic: (phaseCount: number) => void;`.
3. `load`: add `phaseCount: timeline.phaseEnds.length,` to its `set({ … })`.
4. Add after `load`:
   ```ts
   loadStatic: (phaseCount) =>
     set({
       timeline: null,
       phaseCount,
       phaseIndex: 0,
       frameIndex: -1,
       targetFrame: -1,
       isJump: true,
       isPlaying: false,
     }),
   ```
5. `goToPhase` — at the start, replace `if (!timeline) return;` with:
   ```ts
   const { timeline, phaseCount } = get();
   if (!timeline) {
     if (phaseCount > 0) set({ phaseIndex: Math.min(Math.max(index, 0), phaseCount - 1) });
     return;
   }
   ```
   (keep the rest of the function unchanged; remove the now-duplicate `const { timeline } = get();`).
6. `next`:
   ```ts
   next: () => {
     const { timeline, phaseIndex, phaseCount, goToPhase } = get();
     const lastPhase = timeline ? lastPhaseIndex(timeline) : phaseCount - 1;
     if (phaseIndex >= lastPhase) return;
     goToPhase(phaseIndex + 1);
   },
   ```
7. `prev` — replace `if (!timeline) return;` with:
   ```ts
   if (!timeline) {
     set({ phaseIndex: Math.max(phaseIndex - 1, 0) });
     return;
   }
   ```

- [ ] **Step 3: Run tests & checks**

Run: `bun run --cwd apps/web test && bunx biome check --write apps/web && bun run typecheck` → Expected: PASS (all previous player tests still pass).

- [ ] **Step 4: Leave changes uncommitted.**

---

### Task 5: Local database v2 — records, seed, DTO assembly, CRUD

**Files:**
- Modify: `packages/shared/src/schemas/trick.ts` (`RoutineSummarySchema.hasVisualization`), `packages/shared/src/schemas/routine.ts` (`RoutineDetailSchema.items`), `packages/shared/src/schemas/routine.test.ts` (add `items: []` to both routine literals)
- Create: `apps/web/src/api/localSchemas.ts`, `apps/web/src/api/assemble.ts`
- Rewrite: `apps/web/src/types/localDb.types.ts`, `apps/web/src/api/seedData.ts`, `apps/web/src/api/localDb.ts`, `apps/web/src/api/localDb.test.ts`
- Modify: `apps/web/src/store/useRoutine.test.ts` (add `items: []` to `ROUTINE`)

**Interfaces:**
- Consumes: `LIBRARY_FIXTURE` + schemas (Task 3).
- Produces:
  - `DB_STORAGE_KEY = "sleightbook.db.v2"`
  - record types `ITrickRecord`, `IRoutineRecord`, `IPhaseRecord`, `ILocalDatabaseV2`
  - `buildSeedDatabase(fixture: ILibraryFixture, newId, now): ILocalDatabaseV2`
  - `assemble.ts`: `isVisualRoutineRecord`, `routinesOfTrick`, `defaultRoutineOf`, `toTrickSummary`, `toTrickCard`, `toTrickDetail`, `toRoutineDetail`, `techniqueUsages`, `itemUsages`, `toTechniqueSummary`, `toTechniqueDetail`, `toItemSummary`, `toItemDetail`
  - `createLocalDb({ storage, newId, now })` → `{ listTricks, getTrick, setFavorite, getRoutine, listTechniques, getTechnique, listItems, getItem, createNote, updateNote, deleteNote }` (search & migration arrive in Task 6). Notes support `trickId`, `phaseId`, `techniqueId`, `itemId`; `routineId` → `ApiError(400, "NOT_SUPPORTED")`.
  - `localDb` app instance (same export name).

- [ ] **Step 1: Make the two schema changes.**

`packages/shared/src/schemas/trick.ts` — `RoutineSummarySchema` gains `hasVisualization: z.boolean(),`.

`packages/shared/src/schemas/routine.ts` — add `import { ItemSchema } from "./trick";` and add `items: z.array(ItemSchema),` to `RoutineDetailSchema` (after `tips`). In `packages/shared/src/schemas/routine.test.ts` add `items: [],` next to `tips` in both routine literals. In `apps/web/src/store/useRoutine.test.ts` add `items: [],` to `ROUTINE`.

- [ ] **Step 2: Write the failing local database tests.** Replace `apps/web/src/api/localDb.test.ts` with:

```ts
import { describe, expect, spyOn, test } from "bun:test";

import { validateRoutine } from "@sleightbook/engine/timeline";

import { ApiError } from "./apiError";
import { createLocalDb, DB_STORAGE_KEY } from "./localDb";
import { createMemoryStorage, type IStorageLike } from "./storage";

const NOW = "2026-09-26T00:00:00.000Z";
const MISSING_ID = "00000000-0000-4000-8000-00000000ffff";

const makeIdFactory = () => {
  let counter = 0;
  return () => {
    counter += 1;
    return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
  };
};

const makeDb = (storage: IStorageLike = createMemoryStorage()) =>
  createLocalDb({ storage, newId: makeIdFactory(), now: () => NOW });

const errorOf = (fn: () => unknown): ApiError | null => {
  try {
    fn();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  return null;
};

const trickIdBySlug = (db: ReturnType<typeof makeDb>, slug: string): string => {
  const trick = db.listTricks().find((candidate) => candidate.slug === slug);
  if (!trick) throw new Error(`missing ${slug}`);
  return trick.id;
};

describe("localDb v2", () => {
  test("seeds the six-trick library", () => {
    expect(makeDb().listTricks().map((trick) => trick.name)).toEqual([
      "Ambitious Card",
      "Coin Matrix",
      "Oil & Water",
      "Rising Card",
      "Thought Card",
      "Triumph",
    ]);
  });

  test("assembles Ambitious Card with three routines", () => {
    const db = makeDb();
    const trick = db.getTrick(trickIdBySlug(db, "ambitious-card"));
    expect(trick.routines.map((routine) => [routine.name, routine.isDefault, routine.hasVisualization])).toEqual([
      ["Standard", true, true],
      ["Elmsley Version", false, false],
      ["Top Change Version", false, false],
    ]);
    expect(trick.defaultRoutineId).toBe(trick.routines[0]?.id ?? null);
    expect(trick.items.map((item) => item.name)).toEqual(["Deck of cards"]);
    expect(trick.notes).toHaveLength(1);
  });

  test("routine details carry items, ordered phases and sorted techniques", () => {
    const db = makeDb();
    const standard = db.getRoutine(db.getTrick(trickIdBySlug(db, "ambitious-card")).defaultRoutineId ?? "");
    expect(standard.phases.map((phase) => phase.name)).toEqual([
      "Preparation",
      "Double Lift",
      "Insert",
      "Snap",
      "Fan Reveal",
    ]);
    expect(standard.phases[2]?.techniques.map((technique) => technique.name)).toEqual([
      "Card Insertion",
      "Double Lift",
    ]);
    expect(standard.items.map((item) => item.name)).toEqual(["Deck of cards"]);
    expect(validateRoutine(standard.phases)).toEqual({ ok: true });

    const vernon = db.getRoutine(db.getTrick(trickIdBySlug(db, "triumph")).defaultRoutineId ?? "");
    expect(vernon.items.map((item) => item.name)).toEqual(["Close-up mat", "Deck of cards"]);
    expect(validateRoutine(vernon.phases)).toEqual({ ok: true });
  });

  test("technique details list where they are used", () => {
    const db = makeDb();
    const techniques = db.listTechniques();
    expect(techniques).toHaveLength(12);
    const doubleLift = techniques.find((technique) => technique.name === "Double Lift");
    expect(doubleLift?.usageCount).toBe(2);
    const detail = db.getTechnique(doubleLift?.id ?? "");
    expect(detail.usedIn).toEqual([
      expect.objectContaining({ trickName: "Ambitious Card", routineName: "Standard", phaseNames: ["Double Lift", "Insert"] }),
      expect.objectContaining({ trickName: "Ambitious Card", routineName: "Top Change Version", phaseNames: ["Show"] }),
    ]);
  });

  test("item details list the routines that need them", () => {
    const db = makeDb();
    const deck = db.listItems().find((item) => item.name === "Deck of cards");
    expect(deck?.usageCount).toBe(7);
    expect(db.getItem(deck?.id ?? "").usedIn[0]).toMatchObject({ trickName: "Ambitious Card", phaseNames: [] });
  });

  test("favorites persist across instances sharing storage", () => {
    const storage = createMemoryStorage();
    const first = makeDb(storage);
    const id = trickIdBySlug(first, "triumph");
    first.setFavorite(id, true);
    expect(makeDb(storage).getTrick(id).isFavorite).toBe(true);
  });

  test("notes on tricks, phases, techniques and items", () => {
    const db = makeDb();
    const trick = db.getTrick(trickIdBySlug(db, "triumph"));
    const routine = db.getRoutine(trick.defaultRoutineId ?? "");
    const phaseId = routine.phases[2]?.id ?? "";
    const techniqueId = db.listTechniques()[0]?.id ?? "";
    const itemId = db.listItems()[0]?.id ?? "";

    const trickNote = db.createNote({ body: "Trick note", trickId: trick.id });
    const phaseNote = db.createNote({ body: " Phase note ", phaseId });
    const techniqueNote = db.createNote({ body: "Technique note", techniqueId });
    const itemNote = db.createNote({ body: "Item note", itemId });

    expect(db.getTrick(trick.id).notes.map((note) => note.id)).toEqual([trickNote.id]);
    expect(db.getRoutine(routine.id).phases[2]?.notes.map((note) => note.body)).toEqual(["Phase note"]);
    expect(db.getTechnique(techniqueId).notes.map((note) => note.id)).toEqual([techniqueNote.id]);
    expect(db.getItem(itemId).notes.map((note) => note.id)).toEqual([itemNote.id]);

    expect(db.updateNote(phaseNote.id, "Edited").body).toBe("Edited");
    db.deleteNote(itemNote.id);
    expect(db.getItem(itemId).notes).toEqual([]);
  });

  test("errors: 404 missing, 400 invalid, 400 NOT_SUPPORTED for routine notes", () => {
    const db = makeDb();
    const trickId = trickIdBySlug(db, "triumph");
    const routineId = db.getTrick(trickId).defaultRoutineId ?? "";
    expect(errorOf(() => db.getTrick(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.getRoutine(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.getTechnique(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.getItem(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.setFavorite(MISSING_ID, true))?.status).toBe(404);
    expect(errorOf(() => db.updateNote(MISSING_ID, "x"))?.status).toBe(404);
    expect(errorOf(() => db.deleteNote(MISSING_ID))?.status).toBe(404);
    expect(errorOf(() => db.createNote({ body: "ghost", techniqueId: MISSING_ID }))?.status).toBe(404);
    expect(errorOf(() => db.createNote({ body: "  ", trickId }))?.status).toBe(400);
    expect(errorOf(() => db.createNote({ body: "routine", routineId }))?.code).toBe("NOT_SUPPORTED");
  });

  test("backs up and reseeds unreadable v2 data", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    storage.setItem(DB_STORAGE_KEY, "{not json");
    expect(makeDb(storage).listTricks()).toHaveLength(6);
    expect(storage.getItem(`${DB_STORAGE_KEY}.backup-${NOW}`)).toBe("{not json");
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  test("returns copies, not live references", () => {
    const db = makeDb();
    const id = trickIdBySlug(db, "ambitious-card");
    db.getTrick(id).notes.length = 0;
    expect(db.getTrick(id).notes).toHaveLength(1);
  });
});
```

Run: `bun run --cwd apps/web test src/api` → Expected: FAIL.

- [ ] **Step 3: Implement records, seed and assembly.**

`apps/web/src/api/localSchemas.ts`:

```ts
import { z } from "zod";

import { NoteSchema } from "@sleightbook/shared/schemas/note";
import { ActionRecordSchema, TechniqueSchema } from "@sleightbook/shared/schemas/routine";
import { ItemSchema, TrickSummarySchema } from "@sleightbook/shared/schemas/trick";

export const PhaseRecordSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  name: z.string(),
  summary: z.string(),
  explanation: z.string(),
  spectatorText: z.string(),
  actions: z.array(ActionRecordSchema),
  techniqueIds: z.array(z.uuid()),
});

export const RoutineRecordSchema = z.object({
  id: z.uuid(),
  trickId: z.uuid(),
  name: z.string(),
  description: z.string(),
  tips: z.array(z.string()),
  isDefault: z.boolean(),
  position: z.number().int(),
  itemIds: z.array(z.uuid()),
  phases: z.array(PhaseRecordSchema),
});

export const TrickRecordSchema = TrickSummarySchema.extend({
  description: z.string(),
  durationMin: z.number().int(),
  durationMax: z.number().int(),
});

export const LocalDatabaseV2Schema = z.object({
  version: z.literal(2),
  tricks: z.array(TrickRecordSchema),
  routines: z.array(RoutineRecordSchema),
  techniques: z.array(TechniqueSchema),
  items: z.array(ItemSchema),
  notes: z.array(NoteSchema),
});
```

`apps/web/src/types/localDb.types.ts`:

```ts
import type { z } from "zod";

import type {
  LocalDatabaseV2Schema,
  PhaseRecordSchema,
  RoutineRecordSchema,
  TrickRecordSchema,
} from "../api/localSchemas";

export type IPhaseRecord = z.infer<typeof PhaseRecordSchema>;
export type IRoutineRecord = z.infer<typeof RoutineRecordSchema>;
export type ITrickRecord = z.infer<typeof TrickRecordSchema>;
export type ILocalDatabaseV2 = z.infer<typeof LocalDatabaseV2Schema>;
```

`apps/web/src/api/seedData.ts`:

```ts
import type { ILibraryFixture } from "@sleightbook/shared/fixtures/library";
import type { INote } from "@sleightbook/shared/schemas/note";

import type { ILocalDatabaseV2, IRoutineRecord, ITrickRecord } from "../types/localDb.types";

const idFor = (ids: Map<string, string>, name: string, kind: string): string => {
  const id = ids.get(name);
  if (!id) throw new Error(`Unknown ${kind} in fixture: ${name}`);
  return id;
};

export const buildSeedDatabase = (
  fixture: ILibraryFixture,
  newId: () => string,
  now: string,
): ILocalDatabaseV2 => {
  const techniques = fixture.techniques.map((technique) => ({ id: newId(), ...technique }));
  const items = fixture.items.map((item) => ({ id: newId(), ...item }));
  const techniqueIds = new Map(techniques.map((technique) => [technique.name, technique.id]));
  const itemIds = new Map(items.map((item) => [item.name, item.id]));

  const tricks: ITrickRecord[] = [];
  const routines: IRoutineRecord[] = [];
  const notes: INote[] = [];

  for (const entry of fixture.tricks) {
    const trickId = newId();
    tricks.push({ id: trickId, ...entry.trick, isFavorite: false });
    entry.routines.forEach((routine, position) => {
      routines.push({
        id: newId(),
        trickId,
        name: routine.name,
        description: routine.description,
        tips: [...routine.tips],
        isDefault: routine.isDefault,
        position,
        itemIds: routine.items.map((name) => idFor(itemIds, name, "item")),
        phases: routine.phases.map((phase, phasePosition) => ({
          id: newId(),
          position: phasePosition,
          name: phase.name,
          summary: phase.summary,
          explanation: phase.explanation,
          spectatorText: phase.spectatorText,
          actions: phase.actions.map((record, actionPosition) => ({
            id: newId(),
            position: actionPosition,
            durationMs: record.durationMs,
            action: record.action,
          })),
          techniqueIds: phase.techniques.map((name) => idFor(techniqueIds, name, "technique")),
        })),
      });
    });
    if (entry.note) {
      notes.push({
        id: newId(),
        body: entry.note,
        trickId,
        routineId: null,
        phaseId: null,
        techniqueId: null,
        itemId: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return { version: 2, tricks, routines, techniques, items, notes };
};
```

`apps/web/src/api/assemble.ts`:

```ts
import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import type { INote } from "@sleightbook/shared/schemas/note";
import type { IRoutineDetail, ITechnique } from "@sleightbook/shared/schemas/routine";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";
import type {
  IItem,
  ITrickCard,
  ITrickDetail,
  ITrickSummary,
} from "@sleightbook/shared/schemas/trick";
import type { IUsage } from "@sleightbook/shared/schemas/usage";

import type { ILocalDatabaseV2, IRoutineRecord, ITrickRecord } from "../types/localDb.types";

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);
const byCreated = (a: INote, b: INote): number =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

export const isVisualRoutineRecord = (routine: IRoutineRecord): boolean =>
  routine.phases.length > 0 && routine.phases.every((phase) => phase.actions.length > 0);

export const routinesOfTrick = (db: ILocalDatabaseV2, trickId: string): IRoutineRecord[] =>
  db.routines.filter((routine) => routine.trickId === trickId).sort((a, b) => a.position - b.position);

export const defaultRoutineOf = (db: ILocalDatabaseV2, trickId: string): IRoutineRecord | null => {
  const routines = routinesOfTrick(db, trickId);
  return routines.find((routine) => routine.isDefault) ?? routines.at(0) ?? null;
};

const techniqueOf = (db: ILocalDatabaseV2, id: string): ITechnique => {
  const technique = db.techniques.find((candidate) => candidate.id === id);
  if (!technique) throw new Error(`Missing technique ${id}`);
  return technique;
};

const itemOf = (db: ILocalDatabaseV2, id: string): IItem => {
  const item = db.items.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Missing item ${id}`);
  return item;
};

export const toTrickSummary = (trick: ITrickRecord): ITrickSummary => ({
  id: trick.id,
  name: trick.name,
  slug: trick.slug,
  category: trick.category,
  difficulty: trick.difficulty,
  isFavorite: trick.isFavorite,
});

export const toTrickCard = (db: ILocalDatabaseV2, trick: ITrickRecord): ITrickCard => {
  const routine = defaultRoutineOf(db, trick.id);
  const techniqueNames = routine
    ? [...new Set(routine.phases.flatMap((phase) => phase.techniqueIds))]
        .map((id) => techniqueOf(db, id).name)
        .sort((a, b) => a.localeCompare(b))
    : [];
  return {
    ...toTrickSummary(trick),
    description: trick.description,
    durationMin: trick.durationMin,
    durationMax: trick.durationMax,
    phaseCount: routine?.phases.length ?? 0,
    techniqueNames,
    hasVisualization: routine ? isVisualRoutineRecord(routine) : false,
  };
};

export const toTrickDetail = (db: ILocalDatabaseV2, trick: ITrickRecord): ITrickDetail => {
  const defaultRoutine = defaultRoutineOf(db, trick.id);
  return {
    ...toTrickSummary(trick),
    description: trick.description,
    durationMin: trick.durationMin,
    durationMax: trick.durationMax,
    items: defaultRoutine ? defaultRoutine.itemIds.map((id) => itemOf(db, id)).sort(byName) : [],
    routines: routinesOfTrick(db, trick.id).map((routine) => ({
      id: routine.id,
      name: routine.name,
      isDefault: routine.isDefault,
      position: routine.position,
      hasVisualization: isVisualRoutineRecord(routine),
    })),
    defaultRoutineId: defaultRoutine?.id ?? null,
    notes: db.notes.filter((note) => note.trickId === trick.id).sort(byCreated),
  };
};

export const toRoutineDetail = (db: ILocalDatabaseV2, routine: IRoutineRecord): IRoutineDetail => ({
  id: routine.id,
  trickId: routine.trickId,
  name: routine.name,
  description: routine.description,
  tips: [...routine.tips],
  items: routine.itemIds.map((id) => itemOf(db, id)).sort(byName),
  phases: [...routine.phases]
    .sort((a, b) => a.position - b.position)
    .map((phase) => ({
      id: phase.id,
      position: phase.position,
      name: phase.name,
      summary: phase.summary,
      explanation: phase.explanation,
      spectatorText: phase.spectatorText,
      actions: phase.actions,
      techniques: phase.techniqueIds.map((id) => techniqueOf(db, id)).sort(byName),
      notes: db.notes.filter((note) => note.phaseId === phase.id).sort(byCreated),
    })),
});

const collectUsages = (
  db: ILocalDatabaseV2,
  phaseNamesFor: (routine: IRoutineRecord) => string[] | null,
): IUsage[] => {
  const rows: { usage: IUsage; position: number }[] = [];
  for (const routine of db.routines) {
    const phaseNames = phaseNamesFor(routine);
    const trick = db.tricks.find((candidate) => candidate.id === routine.trickId);
    if (phaseNames === null || !trick) continue;
    rows.push({
      usage: {
        trickId: trick.id,
        trickName: trick.name,
        routineId: routine.id,
        routineName: routine.name,
        phaseNames,
      },
      position: routine.position,
    });
  }
  return rows
    .sort((a, b) => a.usage.trickName.localeCompare(b.usage.trickName) || a.position - b.position)
    .map((row) => row.usage);
};

export const techniqueUsages = (db: ILocalDatabaseV2, techniqueId: string): IUsage[] =>
  collectUsages(db, (routine) => {
    const names = [...routine.phases]
      .sort((a, b) => a.position - b.position)
      .filter((phase) => phase.techniqueIds.includes(techniqueId))
      .map((phase) => phase.name);
    return names.length > 0 ? names : null;
  });

export const itemUsages = (db: ILocalDatabaseV2, itemId: string): IUsage[] =>
  collectUsages(db, (routine) => (routine.itemIds.includes(itemId) ? [] : null));

export const toTechniqueSummary = (db: ILocalDatabaseV2, technique: ITechnique): ITechniqueSummary => ({
  id: technique.id,
  name: technique.name,
  category: technique.category,
  difficulty: technique.difficulty,
  usageCount: techniqueUsages(db, technique.id).length,
});

export const toTechniqueDetail = (db: ILocalDatabaseV2, technique: ITechnique): ITechniqueDetail => ({
  ...technique,
  usedIn: techniqueUsages(db, technique.id),
  notes: db.notes.filter((note) => note.techniqueId === technique.id).sort(byCreated),
});

export const toItemSummary = (db: ILocalDatabaseV2, item: IItem): IItemSummary => ({
  ...item,
  usageCount: itemUsages(db, item.id).length,
});

export const toItemDetail = (db: ILocalDatabaseV2, item: IItem): IItemDetail => ({
  ...item,
  usedIn: itemUsages(db, item.id),
  notes: db.notes.filter((note) => note.itemId === item.id).sort(byCreated),
});
```

- [ ] **Step 4: Rewrite `apps/web/src/api/localDb.ts`:**

```ts
import { z } from "zod";

import { LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";
import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import {
  CreateNoteSchema,
  type ICreateNoteInput,
  type INote,
  UpdateNoteSchema,
} from "@sleightbook/shared/schemas/note";
import type { IRoutineDetail, ITechnique } from "@sleightbook/shared/schemas/routine";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";
import type { IItem, ITrickDetail, ITrickSummary } from "@sleightbook/shared/schemas/trick";

import type { ILocalDatabaseV2, IRoutineRecord, ITrickRecord } from "../types/localDb.types";
import { ApiError } from "./apiError";
import {
  toItemDetail,
  toItemSummary,
  toRoutineDetail,
  toTechniqueDetail,
  toTechniqueSummary,
  toTrickDetail,
  toTrickSummary,
} from "./assemble";
import { LocalDatabaseV2Schema } from "./localSchemas";
import { buildSeedDatabase } from "./seedData";
import { getBrowserStorage, type IStorageLike } from "./storage";

export const DB_STORAGE_KEY = "sleightbook.db.v2";

interface ILocalDbOptions {
  storage: IStorageLike;
  newId: () => string;
  now: () => string;
}

const notFound = (entity: string): ApiError => new ApiError(404, "NOT_FOUND", `${entity} not found`);

const validationError = (error: z.ZodError): ApiError =>
  new ApiError(400, "VALIDATION", error.issues.map((issue) => issue.message).join("; "));

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

export const createLocalDb = ({ storage, newId, now }: ILocalDbOptions) => {
  const save = (database: ILocalDatabaseV2): void =>
    storage.setItem(DB_STORAGE_KEY, JSON.stringify(database));

  const readStored = (raw: string): ILocalDatabaseV2 | null => {
    try {
      const parsed = LocalDatabaseV2Schema.safeParse(JSON.parse(raw));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const load = (): ILocalDatabaseV2 => {
    const raw = storage.getItem(DB_STORAGE_KEY);
    if (raw) {
      const stored = readStored(raw);
      if (stored) return stored;
      const backupKey = `${DB_STORAGE_KEY}.backup-${now()}`;
      storage.setItem(backupKey, raw);
      console.warn(
        `Sleightbook: local data was unreadable; a backup was saved under ${backupKey} and the data was reset.`,
      );
    }
    const seeded = buildSeedDatabase(LIBRARY_FIXTURE, newId, now());
    save(seeded);
    return seeded;
  };

  const findTrick = (db: ILocalDatabaseV2, id: string): ITrickRecord => {
    const trick = db.tricks.find((candidate) => candidate.id === id);
    if (!trick) throw notFound("Trick");
    return trick;
  };

  const findRoutine = (db: ILocalDatabaseV2, id: string): IRoutineRecord => {
    const routine = db.routines.find((candidate) => candidate.id === id);
    if (!routine) throw notFound("Routine");
    return routine;
  };

  const findTechnique = (db: ILocalDatabaseV2, id: string): ITechnique => {
    const technique = db.techniques.find((candidate) => candidate.id === id);
    if (!technique) throw notFound("Technique");
    return technique;
  };

  const findItem = (db: ILocalDatabaseV2, id: string): IItem => {
    const item = db.items.find((candidate) => candidate.id === id);
    if (!item) throw notFound("Item");
    return item;
  };

  const findNoteIndex = (db: ILocalDatabaseV2, id: string): number => {
    const index = db.notes.findIndex((note) => note.id === id);
    if (index < 0) throw notFound("Note");
    return index;
  };

  const targetExists = (db: ILocalDatabaseV2, input: ICreateNoteInput): boolean => {
    if (input.trickId) return db.tricks.some((trick) => trick.id === input.trickId);
    if (input.phaseId) {
      return db.routines.some((routine) => routine.phases.some((phase) => phase.id === input.phaseId));
    }
    if (input.techniqueId) return db.techniques.some((technique) => technique.id === input.techniqueId);
    if (input.itemId) return db.items.some((item) => item.id === input.itemId);
    return false;
  };

  return {
    listTricks: (): ITrickSummary[] => load().tricks.map(toTrickSummary).sort(byName),

    getTrick: (id: string): ITrickDetail => {
      const db = load();
      return structuredClone(toTrickDetail(db, findTrick(db, id)));
    },

    setFavorite: (id: string, isFavorite: boolean): ITrickDetail => {
      const db = load();
      const trick = findTrick(db, id);
      trick.isFavorite = isFavorite;
      save(db);
      return structuredClone(toTrickDetail(db, trick));
    },

    getRoutine: (id: string): IRoutineDetail => {
      const db = load();
      return structuredClone(toRoutineDetail(db, findRoutine(db, id)));
    },

    listTechniques: (): ITechniqueSummary[] => {
      const db = load();
      return structuredClone(db.techniques.map((technique) => toTechniqueSummary(db, technique)).sort(byName));
    },

    getTechnique: (id: string): ITechniqueDetail => {
      const db = load();
      return structuredClone(toTechniqueDetail(db, findTechnique(db, id)));
    },

    listItems: (): IItemSummary[] => {
      const db = load();
      return structuredClone(db.items.map((item) => toItemSummary(db, item)).sort(byName));
    },

    getItem: (id: string): IItemDetail => {
      const db = load();
      return structuredClone(toItemDetail(db, findItem(db, id)));
    },

    createNote: (input: ICreateNoteInput): INote => {
      const parsed = CreateNoteSchema.safeParse(input);
      if (!parsed.success) throw validationError(parsed.error);
      if (parsed.data.routineId) {
        throw new ApiError(400, "NOT_SUPPORTED", "Local mode does not support routine notes");
      }
      const db = load();
      if (!targetExists(db, parsed.data)) throw notFound("Note target");
      const timestamp = now();
      const note: INote = {
        id: newId(),
        body: parsed.data.body,
        trickId: parsed.data.trickId ?? null,
        routineId: null,
        phaseId: parsed.data.phaseId ?? null,
        techniqueId: parsed.data.techniqueId ?? null,
        itemId: parsed.data.itemId ?? null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      db.notes.push(note);
      save(db);
      return structuredClone(note);
    },

    updateNote: (id: string, body: string): INote => {
      const parsed = UpdateNoteSchema.safeParse({ body });
      if (!parsed.success) throw validationError(parsed.error);
      const db = load();
      const index = findNoteIndex(db, id);
      const updated: INote = { ...db.notes[index], body: parsed.data.body, updatedAt: now() };
      db.notes[index] = updated;
      save(db);
      return structuredClone(updated);
    },

    deleteNote: (id: string): void => {
      const db = load();
      db.notes.splice(findNoteIndex(db, id), 1);
      save(db);
    },
  };
};

export type TLocalDb = ReturnType<typeof createLocalDb>;

// App instance. Replaced by the Hono client once the API (Part 2) exists.
export const localDb = createLocalDb({
  storage: getBrowserStorage(),
  newId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
});
```

- [ ] **Step 5: Run & verify**

Run:

```bash
bun run --cwd apps/web test
bun test packages
bunx biome check --write apps/web packages
bun run typecheck
```

Expected: all pass. (`trickAPI`/`routineAPI`/`noteAPI` keep compiling because `listTricks`, `getTrick`, `setFavorite`, `getRoutine`, `createNote`, `updateNote`, `deleteNote` keep their names and return types.)

- [ ] **Step 6: Leave changes uncommitted.**

---

### Task 6: Library search & v1 → v2 migration

**Files:**
- Create: `apps/web/src/api/search.ts`, `apps/web/src/api/migrateV1.ts`
- Modify: `apps/web/src/api/localSchemas.ts` (+ `LocalDatabaseV1Schema`), `apps/web/src/types/localDb.types.ts` (+ `ILocalDatabaseV1`), `apps/web/src/api/storage.ts` (+ `removeItem`), `apps/web/src/api/localDb.ts` (+ `searchTricks`, migration in `load`)
- Test: `apps/web/src/api/localDb.search.test.ts`, `apps/web/src/api/localDb.migration.test.ts`

**Interfaces:**
- Consumes: Task 5 local DB & assembly; `LibraryQuerySchema`, `ILibraryQuery`, `IResolvedLibraryQuery`, `ITrickCard`.
- Produces:
  - `localDb.searchTricks(query: ILibraryQuery): ITrickCard[]` — tokens (split on whitespace, lowercase) must **all** appear in: trick name, description, category id + English label, technique & item names of all its routines, notes on the trick and its phases. Filters: `category` (≠ `"all"`), `favoritesOnly`. Sorted by name. Invalid query → `ApiError(400, "VALIDATION")`.
  - `LEGACY_STORAGE_KEY = "sleightbook.db.v1"`; when no v2 data exists, a valid v1 value is migrated into the fresh v2 seed (Ambitious Card favorite, trick notes not already present by body, phase notes by default-routine phase position), copied to `sleightbook.db.v1.migrated`, and removed; an unreadable v1 value is copied to `sleightbook.db.v1.backup-<now>`, removed, and a `console.warn` is logged.
  - `IStorageLike.removeItem(key)`.

- [ ] **Step 1: Write the failing tests.**

`apps/web/src/api/localDb.search.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { ApiError } from "./apiError";
import { createLocalDb } from "./localDb";
import { createMemoryStorage } from "./storage";

const makeDb = () => {
  let counter = 0;
  return createLocalDb({
    storage: createMemoryStorage(),
    newId: () => {
      counter += 1;
      return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
    },
    now: () => "2026-09-26T00:00:00.000Z",
  });
};

const names = (db: ReturnType<typeof makeDb>, query: Parameters<ReturnType<typeof makeDb>["searchTricks"]>[0]) =>
  db.searchTricks(query).map((card) => card.name);

describe("searchTricks", () => {
  test("empty query returns every trick sorted by name, as cards", () => {
    const db = makeDb();
    expect(names(db, {})).toEqual([
      "Ambitious Card",
      "Coin Matrix",
      "Oil & Water",
      "Rising Card",
      "Thought Card",
      "Triumph",
    ]);
    const triumph = db.searchTricks({ q: "triumph" })[0];
    expect(triumph).toMatchObject({ phaseCount: 5, hasVisualization: true });
    expect(triumph?.techniqueNames).toEqual(["Packet Turnover", "Riffle Shuffle", "Spread", "Strip-Out Shuffle"]);
  });

  test("matches technique names across all routines", () => {
    expect(names(makeDb(), { q: "elmsley" })).toEqual(["Ambitious Card", "Oil & Water"]);
  });

  test("matches item names, category labels and is case-insensitive", () => {
    const db = makeDb();
    expect(names(db, { q: "THREAD" })).toEqual(["Rising Card"]);
    expect(names(db, { q: "coin magic" })).toEqual(["Coin Matrix"]);
  });

  test("every token must match", () => {
    expect(names(makeDb(), { q: "rises command" })).toEqual(["Rising Card"]);
    expect(names(makeDb(), { q: "rises elmsley" })).toEqual([]);
  });

  test("matches note text on the trick and its phases", () => {
    const db = makeDb();
    const triumphId = db.searchTricks({ q: "triumph" })[0]?.id ?? "";
    const phaseId = db.getRoutine(db.getTrick(triumphId).defaultRoutineId ?? "").phases[1]?.id ?? "";
    db.createNote({ body: "Shaky hands on the turnover", phaseId });
    expect(names(db, { q: "shaky" })).toEqual(["Triumph"]);
  });

  test("filters by category and favorites", () => {
    const db = makeDb();
    expect(names(db, { category: "coin" })).toEqual(["Coin Matrix"]);
    const triumphId = db.searchTricks({ q: "triumph" })[0]?.id ?? "";
    db.setFavorite(triumphId, true);
    expect(names(db, { favoritesOnly: true })).toEqual(["Triumph"]);
  });

  test("rejects invalid queries", () => {
    try {
      makeDb().searchTricks({ category: "cards" as "card" });
      throw new Error("expected ApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).status).toBe(400);
    }
  });
});
```

`apps/web/src/api/localDb.migration.test.ts`:

```ts
import { describe, expect, spyOn, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { createLocalDb, DB_STORAGE_KEY, LEGACY_STORAGE_KEY } from "./localDb";
import { createMemoryStorage } from "./storage";

const NOW = "2026-09-26T00:00:00.000Z";
const OLD = "2026-09-20T10:00:00.000Z";
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, "0")}`;

const note = (id: number, body: string, target: { trickId?: string; phaseId?: string }) => ({
  id: uuid(id),
  body,
  trickId: target.trickId ?? null,
  routineId: null,
  phaseId: target.phaseId ?? null,
  techniqueId: null,
  itemId: null,
  createdAt: OLD,
  updatedAt: OLD,
});

const V1 = {
  version: 1,
  tricks: [
    {
      id: uuid(900),
      slug: "ambitious-card",
      isFavorite: true,
      defaultRoutineId: uuid(901),
      notes: [
        note(910, AMBITIOUS_CARD.trickNote, { trickId: uuid(900) }),
        note(911, "Old trick note", { trickId: uuid(900) }),
      ],
    },
  ],
  routines: [{ id: uuid(901), phases: [{ position: 2, notes: [note(912, "Old insert note", { phaseId: uuid(950) })] }] }],
};

const makeDb = (storage = createMemoryStorage()) => {
  let counter = 0;
  return createLocalDb({
    storage,
    newId: () => {
      counter += 1;
      return uuid(counter);
    },
    now: () => NOW,
  });
};

describe("v1 → v2 migration", () => {
  test("carries favorite, trick notes and phase notes into v2", () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(V1));
    const db = makeDb(storage);
    const ambitiousId = db.searchTricks({ q: "ambitious" })[0]?.id ?? "";
    const trick = db.getTrick(ambitiousId);

    expect(trick.isFavorite).toBe(true);
    // Notes are ordered by createdAt: the migrated note (Sept 20) precedes the seed note (Sept 26).
    expect(trick.notes.map((entry) => entry.body)).toEqual(["Old trick note", AMBITIOUS_CARD.trickNote]);
    const insert = db.getRoutine(trick.defaultRoutineId ?? "").phases[2];
    expect(insert?.notes.map((entry) => entry.body)).toEqual(["Old insert note"]);
    expect(insert?.notes[0]?.createdAt).toBe(OLD);

    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(storage.getItem(`${LEGACY_STORAGE_KEY}.migrated`)).toBe(JSON.stringify(V1));
    expect(storage.getItem(DB_STORAGE_KEY)).not.toBeNull();
  });

  test("migration runs once", () => {
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(V1));
    makeDb(storage).listTricks();
    const db = makeDb(storage);
    const trick = db.getTrick(db.searchTricks({ q: "ambitious" })[0]?.id ?? "");
    expect(trick.notes).toHaveLength(2);
  });

  test("unreadable v1 data is backed up and removed", () => {
    const warn = spyOn(console, "warn").mockImplementation(() => {});
    const storage = createMemoryStorage();
    storage.setItem(LEGACY_STORAGE_KEY, "{broken");
    expect(makeDb(storage).listTricks()).toHaveLength(6);
    expect(storage.getItem(`${LEGACY_STORAGE_KEY}.backup-${NOW}`)).toBe("{broken");
    expect(storage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });
});
```

Run: `bun run --cwd apps/web test src/api` → Expected: FAIL (`searchTricks`, `LEGACY_STORAGE_KEY` missing).

- [ ] **Step 2: Implement.**

`apps/web/src/api/storage.ts` — add `removeItem(key: string): void;` to `IStorageLike`, and to `createMemoryStorage()`'s returned object:

```ts
    removeItem: (key) => {
      data.delete(key);
    },
```

Append to `apps/web/src/api/localSchemas.ts`:

```ts
// Lenient shape of the MVP1 (v1) store — only the fields the migration needs.
export const LocalDatabaseV1Schema = z.object({
  version: z.literal(1),
  tricks: z.array(
    z.object({
      id: z.string(),
      slug: z.string(),
      isFavorite: z.boolean(),
      defaultRoutineId: z.string().nullable(),
      notes: z.array(NoteSchema),
    }),
  ),
  routines: z.array(
    z.object({
      id: z.string(),
      phases: z.array(z.object({ position: z.number().int(), notes: z.array(NoteSchema) })),
    }),
  ),
});
```

and in `apps/web/src/types/localDb.types.ts` import `LocalDatabaseV1Schema` (type-only) and add `export type ILocalDatabaseV1 = z.infer<typeof LocalDatabaseV1Schema>;`.

`apps/web/src/api/search.ts`:

```ts
import type { TCategory } from "@sleightbook/shared/schemas/enums";
import type { IResolvedLibraryQuery } from "@sleightbook/shared/schemas/trick";

import type { ILocalDatabaseV2, ITrickRecord } from "../types/localDb.types";
import { routinesOfTrick } from "./assemble";

const CATEGORY_LABELS: Record<TCategory, string> = {
  card: "Card Magic",
  coin: "Coin Magic",
  mentalism: "Mentalism",
  gimmick: "Gimmick",
};

export const tokenize = (query: string): string[] => query.toLowerCase().split(/\s+/).filter(Boolean);

const searchableText = (db: ILocalDatabaseV2, trick: ITrickRecord): string => {
  const routines = routinesOfTrick(db, trick.id);
  const phaseIds = new Set(routines.flatMap((routine) => routine.phases.map((phase) => phase.id)));
  const techniqueNames = routines
    .flatMap((routine) => routine.phases.flatMap((phase) => phase.techniqueIds))
    .map((id) => db.techniques.find((technique) => technique.id === id)?.name ?? "");
  const itemNames = routines
    .flatMap((routine) => routine.itemIds)
    .map((id) => db.items.find((item) => item.id === id)?.name ?? "");
  const noteBodies = db.notes
    .filter((note) => note.trickId === trick.id || (note.phaseId !== null && phaseIds.has(note.phaseId)))
    .map((note) => note.body);
  return [
    trick.name,
    trick.description,
    trick.category,
    CATEGORY_LABELS[trick.category],
    ...techniqueNames,
    ...itemNames,
    ...noteBodies,
  ]
    .join("\n")
    .toLowerCase();
};

export const matchesQuery = (
  db: ILocalDatabaseV2,
  trick: ITrickRecord,
  query: IResolvedLibraryQuery,
): boolean => {
  if (query.favoritesOnly && !trick.isFavorite) return false;
  if (query.category !== "all" && trick.category !== query.category) return false;
  const text = searchableText(db, trick);
  return tokenize(query.q).every((token) => text.includes(token));
};
```

`apps/web/src/api/migrateV1.ts`:

```ts
import type { ILocalDatabaseV1, ILocalDatabaseV2 } from "../types/localDb.types";
import { defaultRoutineOf } from "./assemble";

// Carries MVP1 user data (favorite + notes of Ambitious Card) into a freshly seeded v2 store.
export const migrateV1 = (v1: ILocalDatabaseV1, v2: ILocalDatabaseV2, newId: () => string): void => {
  for (const oldTrick of v1.tricks) {
    const trick = v2.tricks.find((candidate) => candidate.slug === oldTrick.slug);
    if (!trick) continue;
    trick.isFavorite = oldTrick.isFavorite;

    const existingBodies = new Set(v2.notes.filter((note) => note.trickId === trick.id).map((note) => note.body));
    for (const note of oldTrick.notes) {
      if (existingBodies.has(note.body)) continue;
      v2.notes.push({ ...note, id: newId(), trickId: trick.id, phaseId: null });
    }

    const oldRoutine = v1.routines.find((routine) => routine.id === oldTrick.defaultRoutineId);
    const newRoutine = defaultRoutineOf(v2, trick.id);
    if (!oldRoutine || !newRoutine) continue;
    for (const oldPhase of oldRoutine.phases) {
      const phase = newRoutine.phases.find((candidate) => candidate.position === oldPhase.position);
      if (!phase) continue;
      for (const note of oldPhase.notes) {
        v2.notes.push({ ...note, id: newId(), trickId: null, phaseId: phase.id });
      }
    }
  }
};
```

In `apps/web/src/api/localDb.ts`:
1. Imports: add `LibraryQuerySchema, type ILibraryQuery, type ITrickCard` from `@sleightbook/shared/schemas/trick`, `toTrickCard` from `./assemble`, `LocalDatabaseV1Schema` from `./localSchemas`, `matchesQuery` from `./search`, `migrateV1` from `./migrateV1`.
2. Add `export const LEGACY_STORAGE_KEY = "sleightbook.db.v1";` below `DB_STORAGE_KEY`.
3. Inside `createLocalDb`, add before `load`:
   ```ts
   const migrateLegacy = (target: ILocalDatabaseV2): void => {
     const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
     if (!legacyRaw) return;
     const legacy = (() => {
       try {
         const parsed = LocalDatabaseV1Schema.safeParse(JSON.parse(legacyRaw));
         return parsed.success ? parsed.data : null;
       } catch {
         return null;
       }
     })();
     if (legacy) {
       migrateV1(legacy, target, newId);
       storage.setItem(`${LEGACY_STORAGE_KEY}.migrated`, legacyRaw);
     } else {
       const backupKey = `${LEGACY_STORAGE_KEY}.backup-${now()}`;
       storage.setItem(backupKey, legacyRaw);
       console.warn(`Sleightbook: old local data was unreadable; a backup was saved under ${backupKey}.`);
     }
     storage.removeItem(LEGACY_STORAGE_KEY);
   };
   ```
4. In `load`, replace the last three lines with:
   ```ts
   const seeded = buildSeedDatabase(LIBRARY_FIXTURE, newId, now());
   if (!raw) migrateLegacy(seeded);
   save(seeded);
   return seeded;
   ```
5. Add the method (after `listTricks`):
   ```ts
   searchTricks: (query: ILibraryQuery): ITrickCard[] => {
     const parsed = LibraryQuerySchema.safeParse(query);
     if (!parsed.success) throw validationError(parsed.error);
     const db = load();
     return structuredClone(
       db.tricks
         .filter((trick) => matchesQuery(db, trick, parsed.data))
         .map((trick) => toTrickCard(db, trick))
         .sort(byName),
     );
   },
   ```

- [ ] **Step 3: Run & verify**

Run: `bun run --cwd apps/web test && bunx biome check --write apps/web && bun run typecheck` → Expected: PASS.

- [ ] **Step 4: Leave changes uncommitted.**

---

### Task 7: API facade, stores & business for library, techniques, items and static routines

**Files:**
- Modify: `apps/web/src/api/trickAPI.ts` (+ `searchTricks`)
- Create: `apps/web/src/api/techniqueAPI.ts`, `apps/web/src/api/itemAPI.ts`
- Create: `apps/web/src/store/useLibrary.ts`, `useTechnique.ts`, `useItem.ts` (+ tests)
- Create: `apps/web/src/utils/routine.ts` (+ test)
- Create: `apps/web/src/business/libraryBusiness.ts`, `techniqueBusiness.ts`, `itemBusiness.ts`
- Modify: `apps/web/src/business/routineBusiness.ts`, `noteBusiness.ts`, `apps/web/src/types/note.types.ts`

**Interfaces:**
- Consumes: `localDb.searchTricks/listTechniques/getTechnique/listItems/getItem` (Tasks 5–6); `usePlayerStore.loadStatic` (Task 4).
- Produces:
  - `searchTricks(query)`, `getTechniques()`, `getTechnique(id)`, `getItems()`, `getItem(id)` (async)
  - `useLibraryStore { cards, isLoading, error, setCards, setIsLoading, setError, setCardFavorite(trickId, isFavorite) }`
  - `useTechniqueStore { techniques, technique, isLoading, error, setTechniques, setTechnique, setIsLoading, setError, upsertNote, removeNote }`
  - `useItemStore { items, item, isLoading, error, setItems, setItem, setIsLoading, setError, upsertNote, removeNote }`
  - `isVisualRoutine(routine: Pick<IRoutineDetail, "phases">): boolean`
  - `doSearchLibrary(query)`, `doToggleCardFavorite(trickId, refreshQuery | null)`, `doGetTechniques()`, `doGetTechnique(id)`, `doGetItems()`, `doGetItem(id)`
  - `doGetRoutine` loads a timeline for visual routines, `loadStatic(phases.length)` otherwise
  - `TNoteTarget = { trickId } | { phaseId } | { techniqueId } | { itemId }`; note business updates trick, routine, technique and item stores

- [ ] **Step 1: Write the failing tests.**

`apps/web/src/utils/routine.test.ts`:

```ts
import { expect, test } from "bun:test";

import { isVisualRoutine } from "./routine";

const phase = (actions: number) => ({
  id: "00000000-0000-4000-8000-000000000001",
  position: 0,
  name: "P",
  summary: "",
  explanation: "",
  spectatorText: "",
  techniques: [],
  notes: [],
  actions: Array.from({ length: actions }, (_, index) => ({
    id: "00000000-0000-4000-8000-000000000002",
    position: index,
    durationMs: 500,
    action: { type: "snap" as const, params: {} },
  })),
});

test("isVisualRoutine requires every phase to have actions", () => {
  expect(isVisualRoutine({ phases: [phase(1), phase(2)] })).toBe(true);
  expect(isVisualRoutine({ phases: [phase(1), phase(0)] })).toBe(false);
  expect(isVisualRoutine({ phases: [] })).toBe(false);
});
```

`apps/web/src/store/useLibrary.test.ts`:

```ts
import { expect, test } from "bun:test";

import type { ITrickCard } from "@sleightbook/shared/schemas/trick";

import { useLibraryStore } from "./useLibrary";

const card = (id: string, isFavorite: boolean): ITrickCard => ({
  id,
  name: id,
  slug: id,
  category: "card",
  difficulty: "beginner",
  isFavorite,
  description: "",
  durationMin: 1,
  durationMax: 2,
  phaseCount: 1,
  techniqueNames: [],
  hasVisualization: false,
});

test("setCardFavorite updates only the matching card", () => {
  useLibraryStore.setState({ cards: [card("a", false), card("b", false)] });
  useLibraryStore.getState().setCardFavorite("b", true);
  expect(useLibraryStore.getState().cards.map((entry) => entry.isFavorite)).toEqual([false, true]);
});
```

`apps/web/src/store/useTechnique.test.ts`:

```ts
import { beforeEach, expect, test } from "bun:test";

import type { INote } from "@sleightbook/shared/schemas/note";
import type { ITechniqueDetail } from "@sleightbook/shared/schemas/technique";

import { useTechniqueStore } from "./useTechnique";

const TECHNIQUE_ID = "00000000-0000-4000-8000-000000000031";

const note = (id: string, techniqueId: string | null): INote => ({
  id,
  body: id,
  trickId: techniqueId ? null : "00000000-0000-4000-8000-000000000099",
  routineId: null,
  phaseId: null,
  techniqueId,
  itemId: null,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
});

const TECHNIQUE: ITechniqueDetail = {
  id: TECHNIQUE_ID,
  name: "Double Lift",
  description: "",
  difficulty: "intermediate",
  category: "Control",
  tips: [],
  commonMistakes: [],
  usedIn: [],
  notes: [],
};

beforeEach(() => {
  useTechniqueStore.setState({ technique: TECHNIQUE, techniques: [], isLoading: false, error: null });
});

test("upsertNote adds notes for this technique only", () => {
  useTechniqueStore.getState().upsertNote(note("n1", TECHNIQUE_ID));
  useTechniqueStore.getState().upsertNote(note("n2", null));
  expect(useTechniqueStore.getState().technique?.notes.map((entry) => entry.id)).toEqual(["n1"]);
});

test("removeNote removes it", () => {
  useTechniqueStore.getState().upsertNote(note("n1", TECHNIQUE_ID));
  useTechniqueStore.getState().removeNote("n1");
  expect(useTechniqueStore.getState().technique?.notes).toEqual([]);
});
```

`apps/web/src/store/useItem.test.ts`:

```ts
import { beforeEach, expect, test } from "bun:test";

import type { IItemDetail } from "@sleightbook/shared/schemas/item";
import type { INote } from "@sleightbook/shared/schemas/note";

import { useItemStore } from "./useItem";

const ITEM_ID = "00000000-0000-4000-8000-000000000041";

const note = (id: string, itemId: string | null): INote => ({
  id,
  body: id,
  trickId: itemId ? null : "00000000-0000-4000-8000-000000000099",
  routineId: null,
  phaseId: null,
  techniqueId: null,
  itemId,
  createdAt: "2026-09-26T00:00:00.000Z",
  updatedAt: "2026-09-26T00:00:00.000Z",
});

const ITEM: IItemDetail = {
  id: ITEM_ID,
  kind: "prop",
  name: "Deck of cards",
  description: "",
  setupNotes: "",
  usedIn: [],
  notes: [],
};

beforeEach(() => {
  useItemStore.setState({ item: ITEM, items: [], isLoading: false, error: null });
});

test("upsertNote adds notes for this item only", () => {
  useItemStore.getState().upsertNote(note("n1", ITEM_ID));
  useItemStore.getState().upsertNote(note("n2", null));
  expect(useItemStore.getState().item?.notes.map((entry) => entry.id)).toEqual(["n1"]);
});

test("removeNote removes it", () => {
  useItemStore.getState().upsertNote(note("n1", ITEM_ID));
  useItemStore.getState().removeNote("n1");
  expect(useItemStore.getState().item?.notes).toEqual([]);
});
```

Run: `bun run --cwd apps/web test` → Expected: FAIL (modules missing).

- [ ] **Step 2: Implement the API facade.**

Append to `apps/web/src/api/trickAPI.ts` (and add `import type { ILibraryQuery } from "@sleightbook/shared/schemas/trick";` in the type-import group):

```ts
export const searchTricks = async (query: ILibraryQuery) => localDb.searchTricks(query);
```

`apps/web/src/api/techniqueAPI.ts`:

```ts
import { localDb } from "./localDb";

export const getTechniques = async () => localDb.listTechniques();

export const getTechnique = async (id: string) => localDb.getTechnique(id);
```

`apps/web/src/api/itemAPI.ts`:

```ts
import { localDb } from "./localDb";

export const getItems = async () => localDb.listItems();

export const getItem = async (id: string) => localDb.getItem(id);
```

- [ ] **Step 3: Implement utils and stores.**

`apps/web/src/utils/routine.ts`:

```ts
import type { IRoutineDetail } from "@sleightbook/shared/schemas/routine";

export const isVisualRoutine = (routine: Pick<IRoutineDetail, "phases">): boolean =>
  routine.phases.length > 0 && routine.phases.every((phase) => phase.actions.length > 0);
```

`apps/web/src/store/useLibrary.ts`:

```ts
import { create } from "zustand";

import type { ITrickCard } from "@sleightbook/shared/schemas/trick";

interface ILibraryStore {
  cards: ITrickCard[];
  isLoading: boolean;
  error: string | null;
  setCards: (cards: ITrickCard[]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setCardFavorite: (trickId: string, isFavorite: boolean) => void;
}

export const useLibraryStore = create<ILibraryStore>((set) => ({
  cards: [],
  isLoading: false,
  error: null,
  setCards: (cards) => set({ cards }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setCardFavorite: (trickId, isFavorite) =>
    set(({ cards }) => ({
      cards: cards.map((card) => (card.id === trickId ? { ...card, isFavorite } : card)),
    })),
}));
```

`apps/web/src/store/useTechnique.ts`:

```ts
import { create } from "zustand";

import type { INote } from "@sleightbook/shared/schemas/note";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";

import { removeById, upsertById } from "../utils/list";

interface ITechniqueStore {
  techniques: ITechniqueSummary[];
  technique: ITechniqueDetail | null;
  isLoading: boolean;
  error: string | null;
  setTechniques: (techniques: ITechniqueSummary[]) => void;
  setTechnique: (technique: ITechniqueDetail | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  upsertNote: (note: INote) => void;
  removeNote: (noteId: string) => void;
}

export const useTechniqueStore = create<ITechniqueStore>((set) => ({
  techniques: [],
  technique: null,
  isLoading: false,
  error: null,
  setTechniques: (techniques) => set({ techniques }),
  setTechnique: (technique) => set({ technique }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  upsertNote: (note) =>
    set(({ technique }) =>
      technique && note.techniqueId === technique.id
        ? { technique: { ...technique, notes: upsertById(technique.notes, note) } }
        : {},
    ),
  removeNote: (noteId) =>
    set(({ technique }) =>
      technique ? { technique: { ...technique, notes: removeById(technique.notes, noteId) } } : {},
    ),
}));
```

`apps/web/src/store/useItem.ts`:

```ts
import { create } from "zustand";

import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import type { INote } from "@sleightbook/shared/schemas/note";

import { removeById, upsertById } from "../utils/list";

interface IItemStore {
  items: IItemSummary[];
  item: IItemDetail | null;
  isLoading: boolean;
  error: string | null;
  setItems: (items: IItemSummary[]) => void;
  setItem: (item: IItemDetail | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  upsertNote: (note: INote) => void;
  removeNote: (noteId: string) => void;
}

export const useItemStore = create<IItemStore>((set) => ({
  items: [],
  item: null,
  isLoading: false,
  error: null,
  setItems: (items) => set({ items }),
  setItem: (item) => set({ item }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  upsertNote: (note) =>
    set(({ item }) =>
      item && note.itemId === item.id ? { item: { ...item, notes: upsertById(item.notes, note) } } : {},
    ),
  removeNote: (noteId) =>
    set(({ item }) => (item ? { item: { ...item, notes: removeById(item.notes, noteId) } } : {})),
}));
```

- [ ] **Step 4: Implement the business layer.**

`apps/web/src/types/note.types.ts`:

```ts
export type TNoteTarget =
  | { trickId: string }
  | { phaseId: string }
  | { techniqueId: string }
  | { itemId: string };
```

`apps/web/src/business/libraryBusiness.ts`:

```ts
import type { ILibraryQuery } from "@sleightbook/shared/schemas/trick";

import { patchTrickFavorite, searchTricks } from "../api/trickAPI";
import { useLibraryStore } from "../store/useLibrary";
import { handleError } from "./errorHandler";

// Guards against out-of-order results once searches become network calls.
let latestSearchId = 0;

export const doSearchLibrary = async (query: ILibraryQuery): Promise<void> => {
  const { setCards, setIsLoading, setError } = useLibraryStore.getState();
  latestSearchId += 1;
  const searchId = latestSearchId;
  try {
    setIsLoading(true);
    setError(null);
    const cards = await searchTricks(query);
    if (searchId === latestSearchId) setCards(cards);
  } catch (error) {
    if (searchId === latestSearchId) setError(handleError(error));
  } finally {
    if (searchId === latestSearchId) setIsLoading(false);
  }
};

export const doToggleCardFavorite = async (
  trickId: string,
  refreshQuery: ILibraryQuery | null,
): Promise<void> => {
  const { cards, setCardFavorite } = useLibraryStore.getState();
  const card = cards.find((candidate) => candidate.id === trickId);
  if (!card) return;
  const isFavorite = !card.isFavorite;
  setCardFavorite(trickId, isFavorite);
  try {
    await patchTrickFavorite(trickId, isFavorite);
    if (refreshQuery) await doSearchLibrary(refreshQuery);
  } catch (error) {
    setCardFavorite(trickId, !isFavorite);
    handleError(error);
  }
};
```

`apps/web/src/business/techniqueBusiness.ts`:

```ts
import { getTechnique, getTechniques } from "../api/techniqueAPI";
import { useTechniqueStore } from "../store/useTechnique";
import { handleError } from "./errorHandler";

export const doGetTechniques = async (): Promise<void> => {
  const { setTechniques, setIsLoading, setError } = useTechniqueStore.getState();
  try {
    setIsLoading(true);
    setError(null);
    setTechniques(await getTechniques());
  } catch (error) {
    setError(handleError(error));
  } finally {
    setIsLoading(false);
  }
};

export const doGetTechnique = async (id: string): Promise<void> => {
  const { setTechnique, setIsLoading, setError } = useTechniqueStore.getState();
  try {
    setIsLoading(true);
    setError(null);
    setTechnique(await getTechnique(id));
  } catch (error) {
    setError(handleError(error));
  } finally {
    setIsLoading(false);
  }
};
```

`apps/web/src/business/itemBusiness.ts`:

```ts
import { getItem, getItems } from "../api/itemAPI";
import { useItemStore } from "../store/useItem";
import { handleError } from "./errorHandler";

export const doGetItems = async (): Promise<void> => {
  const { setItems, setIsLoading, setError } = useItemStore.getState();
  try {
    setIsLoading(true);
    setError(null);
    setItems(await getItems());
  } catch (error) {
    setError(handleError(error));
  } finally {
    setIsLoading(false);
  }
};

export const doGetItem = async (id: string): Promise<void> => {
  const { setItem, setIsLoading, setError } = useItemStore.getState();
  try {
    setIsLoading(true);
    setError(null);
    setItem(await getItem(id));
  } catch (error) {
    setError(handleError(error));
  } finally {
    setIsLoading(false);
  }
};
```

`apps/web/src/business/routineBusiness.ts` — replace the line `usePlayerStore.getState().load(buildTimeline(routine.phases));` with:

```ts
    const player = usePlayerStore.getState();
    if (isVisualRoutine(routine)) player.load(buildTimeline(routine.phases));
    else player.loadStatic(routine.phases.length);
```

and add `import { isVisualRoutine } from "../utils/routine";` to its imports.

`apps/web/src/business/noteBusiness.ts`:
- add imports `import { useItemStore } from "../store/useItem";` and `import { useTechniqueStore } from "../store/useTechnique";`
- `applyNote` becomes:
  ```ts
  const applyNote = (note: INote): void => {
    useTrickStore.getState().upsertNote(note);
    useRoutineStore.getState().upsertNote(note);
    useTechniqueStore.getState().upsertNote(note);
    useItemStore.getState().upsertNote(note);
  };
  ```
- in `doDeleteNote`, after the two existing `removeNote(id)` calls add
  `useTechniqueStore.getState().removeNote(id);` and `useItemStore.getState().removeNote(id);`.

- [ ] **Step 5: Run & verify**

Run: `bun run --cwd apps/web test && bunx biome check --write apps/web && bun run typecheck` → Expected: PASS.

- [ ] **Step 6: Leave changes uncommitted.**

---

### Task 8: Render packet scenes in the SVG visualizer

**Files:**
- Modify: `apps/web/src/components/SceneSvg/SceneSvg.tsx`
- Modify: `apps/web/src/i18n/locales/en.json`, `id.json` (+ `visualizer.reversed`)

**Interfaces:**
- Consumes: engine node kinds `packetBlock`, `mixedBlock`, highlight `reversed` (Task 2).
- Produces: packet blocks render as a face-down stack (reuses `DeckBlock`) or a face-up stack; `mixedBlock` renders a striped face-up/face-down stack; cards with highlight `reversed` get the gold outline plus a badge `visualizer.reversed` ("Reversed" / "Terbalik"). `data-kind` attributes (`packetBlock`, `mixedBlock`) are what the E2E suite counts.

- [ ] **Step 1: Add i18n keys** — `en.json` `visualizer.reversed: "Reversed"`; `id.json` `visualizer.reversed: "Terbalik"`.

- [ ] **Step 2: Update `SceneSvg.tsx`.**
1. In `SceneSvg`, add `const clipId = \`${baseId}-mix\`;` next to `patternId`.
2. Replace the `perceivedText={…}` prop with a `badgeText` computed per node:
   ```tsx
   <NodeShape node={node} patternId={patternId} clipId={clipId} badgeText={badgeTextFor(node)} />
   ```
   where, inside `SceneSvg` (after `transition`):
   ```tsx
   const badgeTextFor = (node: IRenderNode): string | null => {
     if (node.perceivedLabel) {
       return t("visualizer.spectatorThinks", { card: formatCardLabel(node.perceivedLabel).text });
     }
     return node.highlight === "reversed" ? t("visualizer.reversed") : null;
   };
   ```
3. `NodeShape` props become `{ node: IRenderNode; patternId: string; clipId: string; badgeText: string | null }`; replace its first line with:
   ```tsx
   if (node.kind === "deckBlock") return <DeckBlock patternId={patternId} />;
   if (node.kind === "packetBlock") {
     return node.face === "up" ? <FaceUpBlock /> : <DeckBlock patternId={patternId} />;
   }
   if (node.kind === "mixedBlock") return <MixedBlock clipId={clipId} />;
   ```
   and rename `perceivedText` → `badgeText` in its body.
4. Add two sub-components at the bottom of the file:

```tsx
const MIXED_STRIPES = [0, 1, 2, 3, 4, 5, 6, 7];

const FaceUpBlock = () => (
  <>
    <rect x={4} y={5} width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} className="fill-card-face stroke-subtle" strokeWidth={1} />
    <rect x={2} y={2.5} width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} className="fill-card-face stroke-subtle" strokeWidth={1} />
    <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} className="fill-card-face stroke-subtle" strokeWidth={1} />
    <rect
      x={8}
      y={8}
      width={CARD_WIDTH - 16}
      height={CARD_HEIGHT - 16}
      rx={3}
      className="fill-none stroke-line-2"
      strokeWidth={1}
      strokeDasharray="2 3"
    />
  </>
);

const MixedBlock = ({ clipId }: { clipId: string }) => (
  <>
    <rect x={4} y={5} width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} className="fill-panel-3 stroke-line-2" strokeWidth={1} />
    <defs>
      <clipPath id={clipId}>
        <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} />
      </clipPath>
    </defs>
    <g clipPath={`url(#${clipId})`}>
      {MIXED_STRIPES.map((stripe) => (
        <rect
          key={`stripe-${stripe}`}
          y={(CARD_HEIGHT / MIXED_STRIPES.length) * stripe}
          width={CARD_WIDTH}
          height={CARD_HEIGHT / MIXED_STRIPES.length}
          className={stripe % 2 === 0 ? "fill-card-face" : "fill-card-back"}
        />
      ))}
    </g>
    <rect width={CARD_WIDTH} height={CARD_HEIGHT} rx={6} className="fill-none stroke-line-2" strokeWidth={1} />
  </>
);
```

(`strokeClass` already returns `stroke-gold` for any highlight other than `none`, so `reversed` cards get the gold outline without further change; the dash stays only for `perceived`.)

- [ ] **Step 3: Verify**

Run: `bunx biome check --write apps/web && bun run typecheck && bun run --cwd apps/web test` → Expected: PASS (includes locale parity).

- [ ] **Step 4: Leave changes uncommitted.**

---

### Task 9: Library page, favorites, navigation & top-bar search

**Files:**
- Modify: `apps/web/src/constants/routes.ts`
- Create: `apps/web/src/constants/library.ts`, `apps/web/src/utils/library.ts` (+ test)
- Create: `apps/web/src/components/TrickCard/TrickCard.tsx`, `apps/web/src/components/NavLinks/NavLinks.tsx`
- Create: `apps/web/src/contents/Library/Library.tsx`
- Rewrite: `apps/web/src/components/Sidebar/Sidebar.tsx`, `apps/web/src/components/TopBar/TopBar.tsx`
- Modify: `apps/web/src/routes/router.tsx`
- Delete: `apps/web/src/contents/Home/HomeRedirect.tsx`
- Remove dead plumbing: `getTricks` (trickAPI), `doGetTricks` & `doOpenFirstTrick` (trickBusiness), `tricks`/`setTricks` (useTrick + its test's `setState`)
- Modify: `en.json`, `id.json`

**Interfaces:**
- Consumes: `doSearchLibrary`, `doToggleCardFavorite`, `useLibraryStore` (Task 7).
- Produces:
  - Routes: `/` → `<Library />`, `/favorites` → `<Library favoritesOnly />`; constants `ROUTE_FAVORITES`, `ROUTE_TECHNIQUES`, `ROUTE_TECHNIQUE`, `ROUTE_ITEMS`, `ROUTE_ITEM`; helpers `toTrickPath(id, routineId?)`, `toTechniquePath(id)`, `toItemPath(id)`, `toLibraryPath(q)`
  - `parseCategory(value: string | null): TLibraryCategory`
  - Accessible names used by E2E: page `h1` "Magic Library" / "Favorites"; searchbox "Search tricks"; category buttons "All", "Card", "Coin", "Mentalism", "Gimmick" (`aria-pressed`); list "Tricks" with one `li` per card, card title `h3` containing a link with the trick name; favorite button "Favorite {{name}}" (`aria-pressed`); top-bar searchbox "Search the library"; nav links "Library", "Favorites", "Techniques", "Gimmicks & Props".

- [ ] **Step 1: Failing test** `apps/web/src/utils/library.test.ts`:

```ts
import { expect, test } from "bun:test";

import { parseCategory } from "./library";

test("parseCategory accepts known categories and falls back to all", () => {
  expect(parseCategory("coin")).toBe("coin");
  expect(parseCategory("all")).toBe("all");
  expect(parseCategory("cards")).toBe("all");
  expect(parseCategory(null)).toBe("all");
});
```

Run → FAIL. Implement `apps/web/src/utils/library.ts`:

```ts
import { LIBRARY_CATEGORIES, type TLibraryCategory } from "@sleightbook/shared/schemas/trick";

export const parseCategory = (value: string | null): TLibraryCategory =>
  LIBRARY_CATEGORIES.find((category) => category === value) ?? "all";
```

- [ ] **Step 2: Routes & constants.**

Replace `apps/web/src/constants/routes.ts` with:

```ts
export const ROUTE_FAVORITES = "favorites";
export const ROUTE_TRICK = "tricks/:id";
export const ROUTE_TECHNIQUES = "techniques";
export const ROUTE_TECHNIQUE = "techniques/:id";
export const ROUTE_ITEMS = "items";
export const ROUTE_ITEM = "items/:id";

export const toTrickPath = (id: string, routineId?: string): string =>
  routineId ? `/tricks/${id}?routine=${encodeURIComponent(routineId)}` : `/tricks/${id}`;

export const toTechniquePath = (id: string): string => `/techniques/${id}`;

export const toItemPath = (id: string): string => `/items/${id}`;

export const toLibraryPath = (query: string): string => {
  const trimmed = query.trim();
  return trimmed ? `/?q=${encodeURIComponent(trimmed)}` : "/";
};
```

`apps/web/src/constants/library.ts`:

```ts
import type { TCategory } from "@sleightbook/shared/schemas/enums";

export const CATEGORY_ICONS: Record<TCategory, string> = {
  card: "♠",
  coin: "◉",
  mentalism: "✦",
  gimmick: "↑",
};

export const MAX_CARD_TAGS = 3;
```

- [ ] **Step 3: i18n keys.** Add to `en.json`:

```json
"nav": {
  "label": "Main navigation",
  "library": "Library",
  "favorites": "Favorites",
  "techniques": "Techniques",
  "items": "Gimmicks & Props"
},
"topbar": { "search": "Search the library", "searchPlaceholder": "Search tricks, techniques, notes…" },
"library": {
  "title": "Magic Library",
  "subtitle": "Remember the method. Rebuild the performance.",
  "favoritesTitle": "Favorites",
  "favoritesSubtitle": "The routines you keep coming back to.",
  "search": "Search tricks",
  "searchPlaceholder": "Search by name, technique, prop or note…",
  "categories": "Filter by category",
  "filter": { "all": "All", "card": "Card", "coin": "Coin", "mentalism": "Mentalism", "gimmick": "Gimmick" },
  "heading": "Tricks",
  "count_one": "{{count}} trick",
  "count_other": "{{count}} tricks",
  "phases_one": "{{count}} phase",
  "phases_other": "{{count}} phases",
  "visual": "Visual",
  "favorite": "Favorite {{name}}",
  "empty": "No tricks match your search.",
  "emptyFavorites": "No favorites yet. Star a trick to keep it here.",
  "clearFilters": "Clear filters"
}
```

and to `id.json`:

```json
"nav": {
  "label": "Navigasi utama",
  "library": "Pustaka",
  "favorites": "Favorit",
  "techniques": "Teknik",
  "items": "Gimmick & Properti"
},
"topbar": { "search": "Cari di pustaka", "searchPlaceholder": "Cari trik, teknik, catatan…" },
"library": {
  "title": "Pustaka Sulap",
  "subtitle": "Ingat metodenya. Bangun ulang pertunjukannya.",
  "favoritesTitle": "Favorit",
  "favoritesSubtitle": "Routine yang selalu kamu buka lagi.",
  "search": "Cari trik",
  "searchPlaceholder": "Cari nama, teknik, properti, atau catatan…",
  "categories": "Filter kategori",
  "filter": { "all": "Semua", "card": "Kartu", "coin": "Koin", "mentalism": "Mentalisme", "gimmick": "Gimmick" },
  "heading": "Trik",
  "count_one": "{{count}} trik",
  "count_other": "{{count}} trik",
  "phases_one": "{{count}} fase",
  "phases_other": "{{count}} fase",
  "visual": "Visual",
  "favorite": "Favoritkan {{name}}",
  "empty": "Tidak ada trik yang cocok.",
  "emptyFavorites": "Belum ada favorit. Beri bintang pada trik untuk menyimpannya di sini.",
  "clearFilters": "Hapus filter"
}
```

Remove the now-unused `app.empty` key from **both** files (it was only used by `HomeRedirect`).

- [ ] **Step 4: Components.**

`apps/web/src/components/NavLinks/NavLinks.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";

interface NavLinksProps {
  orientation: "vertical" | "horizontal";
}

const NAV_ITEMS = [
  { to: "/", labelKey: "nav.library", end: true },
  { to: "/favorites", labelKey: "nav.favorites", end: false },
  { to: "/techniques", labelKey: "nav.techniques", end: false },
  { to: "/items", labelKey: "nav.items", end: false },
] as const;

export const NavLinks = ({ orientation }: NavLinksProps) => {
  const { t } = useTranslation();
  return (
    <ul className={orientation === "vertical" ? "grid gap-1" : "flex gap-1 overflow-x-auto"}>
      {NAV_ITEMS.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `block whitespace-nowrap rounded-md px-3 py-2 text-sm ${
                isActive
                  ? "bg-panel-3 text-gold-2 shadow-[inset_2px_0_var(--color-gold)]"
                  : "text-muted hover:bg-panel-3 hover:text-fg"
              }`
            }
          >
            {t(item.labelKey)}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};
```

`apps/web/src/components/Sidebar/Sidebar.tsx` (rewrite):

```tsx
import { useTranslation } from "react-i18next";

import { Brand } from "../Brand/Brand";
import { NavLinks } from "../NavLinks/NavLinks";

export const Sidebar = () => {
  const { t } = useTranslation();
  return (
    <aside className="hidden border-r border-line bg-sidebar px-4 py-6 md:block">
      <div className="pb-8">
        <Brand />
      </div>
      <nav aria-label={t("nav.label")}>
        <NavLinks orientation="vertical" />
      </nav>
    </aside>
  );
};
```

`apps/web/src/components/TopBar/TopBar.tsx` (rewrite):

```tsx
import { type ChangeEvent, type FormEvent, useState } from "react";

import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

import { toLibraryPath } from "../../constants/routes";
import { Brand } from "../Brand/Brand";
import { LanguageSwitch } from "../LanguageSwitch/LanguageSwitch";
import { NavLinks } from "../NavLinks/NavLinks";

export const TopBar = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => setQuery(event.target.value);
  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(toLibraryPath(query));
  };

  return (
    <header className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-10">
      <div className="md:hidden">
        <Brand />
      </div>
      <form
        onSubmit={handleSearchSubmit}
        className="order-last w-full md:order-none md:w-auto md:max-w-xl md:flex-1"
      >
        <input
          type="search"
          value={query}
          onChange={handleQueryChange}
          aria-label={t("topbar.search")}
          placeholder={t("topbar.searchPlaceholder")}
          className="field"
        />
      </form>
      <div className="ml-auto">
        <LanguageSwitch />
      </div>
      <nav aria-label={t("nav.label")} className="w-full md:hidden">
        <NavLinks orientation="horizontal" />
      </nav>
    </header>
  );
};
```

`apps/web/src/components/TrickCard/TrickCard.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { ITrickCard } from "@sleightbook/shared/schemas/trick";

import { CATEGORY_ICONS, MAX_CARD_TAGS } from "../../constants/library";
import { toTrickPath } from "../../constants/routes";

interface TrickCardProps {
  card: ITrickCard;
  onToggleFavorite: (trickId: string) => void;
}

export const TrickCard = ({ card, onToggleFavorite }: TrickCardProps) => {
  const { t } = useTranslation();
  const favoriteLabel = t("library.favorite", { name: card.name });

  const handleFavoriteClick = () => onToggleFavorite(card.id);

  return (
    <article className="relative h-full rounded-xl border border-line bg-panel p-4 transition hover:-translate-y-0.5 hover:border-gold-dim focus-within:border-gold-dim">
      <div className="mb-5 flex items-center justify-between">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 place-items-center rounded-lg border border-gold-dim bg-gold-deep text-lg text-gold-2"
        >
          {CATEGORY_ICONS[card.category]}
        </span>
        <button
          type="button"
          aria-pressed={card.isFavorite}
          aria-label={favoriteLabel}
          title={favoriteLabel}
          onClick={handleFavoriteClick}
          className={`relative z-10 rounded-md px-2 py-1 text-lg ${
            card.isFavorite ? "text-gold" : "text-subtle hover:text-gold-2"
          }`}
        >
          <span aria-hidden="true">{card.isFavorite ? "★" : "☆"}</span>
        </button>
      </div>
      <h3 className="text-base font-semibold">
        <Link to={toTrickPath(card.id)} className="after:absolute after:inset-0 after:content-[''] hover:text-gold-2">
          {card.name}
        </Link>
      </h3>
      <p className="text-xs text-muted">
        {t(`category.${card.category}`)} · {t(`difficulty.${card.difficulty}`)} ·{" "}
        {t("library.phases", { count: card.phaseCount })}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {card.hasVisualization && (
          <span className="rounded border border-gold-dim px-1.5 py-0.5 text-xs text-gold-2">{t("library.visual")}</span>
        )}
        {card.techniqueNames.slice(0, MAX_CARD_TAGS).map((name) => (
          <span key={name} className="rounded bg-panel-3 px-1.5 py-0.5 text-xs text-muted">
            {name}
          </span>
        ))}
      </div>
    </article>
  );
};
```

`apps/web/src/contents/Library/Library.tsx`:

```tsx
import { type ChangeEvent, useEffect } from "react";

import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";

import { LIBRARY_CATEGORIES, type TLibraryCategory } from "@sleightbook/shared/schemas/trick";

import { useLibraryStore } from "../../store/useLibrary";
import { doSearchLibrary, doToggleCardFavorite } from "../../business/libraryBusiness";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { TrickCard } from "../../components/TrickCard/TrickCard";
import { parseCategory } from "../../utils/library";

interface LibraryProps {
  favoritesOnly?: boolean;
}

export const Library = ({ favoritesOnly = false }: LibraryProps) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { cards, isLoading, error } = useLibraryStore();
  const q = searchParams.get("q") ?? "";
  const category = parseCategory(searchParams.get("category"));
  const hasFilters = q !== "" || category !== "all";

  useEffect(() => {
    void doSearchLibrary({ q, category, favoritesOnly });
  }, [q, category, favoritesOnly]);

  const updateParams = (nextQuery: string, nextCategory: TLibraryCategory) => {
    const params: Record<string, string> = {};
    if (nextQuery) params.q = nextQuery;
    if (nextCategory !== "all") params.category = nextCategory;
    setSearchParams(params, { replace: true });
  };
  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => updateParams(event.target.value, category);
  const handleCategorySelect = (nextCategory: TLibraryCategory) => updateParams(q, nextCategory);
  const handleClearFilters = () => updateParams("", "all");
  const handleToggleFavorite = (trickId: string) => {
    void doToggleCardFavorite(trickId, favoritesOnly ? { q, category, favoritesOnly } : null);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {t(favoritesOnly ? "library.favoritesTitle" : "library.title")}
        </h1>
        <p className="text-sm text-muted">{t(favoritesOnly ? "library.favoritesSubtitle" : "library.subtitle")}</p>
      </div>
      <input
        type="search"
        value={q}
        onChange={handleQueryChange}
        aria-label={t("library.search")}
        placeholder={t("library.searchPlaceholder")}
        className="field mb-4 max-w-xl"
      />
      <fieldset aria-label={t("library.categories")} className="mb-6 flex flex-wrap gap-2">
        {LIBRARY_CATEGORIES.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={category === option}
            onClick={() => handleCategorySelect(option)}
            className={`rounded-full border px-3 py-1 text-sm ${
              category === option
                ? "border-gold-dim bg-gold-deep text-gold-2"
                : "border-line text-muted hover:border-gold-dim hover:text-gold-2"
            }`}
          >
            {t(`library.filter.${option}`)}
          </button>
        ))}
      </fieldset>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t("library.heading")}</h2>
        <span role="status" className="text-xs text-subtle">
          {t("library.count", { count: cards.length })}
        </span>
      </div>
      {error ? (
        <StatusMessage message={error} />
      ) : cards.length === 0 && !isLoading ? (
        <div className="py-16 text-center">
          <p className="text-muted">
            {t(favoritesOnly && !hasFilters ? "library.emptyFavorites" : "library.empty")}
          </p>
          {hasFilters && (
            <button type="button" onClick={handleClearFilters} className="btn-secondary mt-4">
              {t("library.clearFilters")}
            </button>
          )}
        </div>
      ) : (
        <ul aria-label={t("library.heading")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <li key={card.id}>
              <TrickCard card={card} onToggleFavorite={handleToggleFavorite} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
```

`apps/web/src/routes/router.tsx`:

```tsx
import { createBrowserRouter } from "react-router";

import { ROUTE_FAVORITES, ROUTE_TRICK } from "../constants/routes";
import { AppLayout } from "../contents/Layout/AppLayout";
import { Library } from "../contents/Library/Library";
import { NotFound } from "../contents/NotFound/NotFound";
import { TrickDetail } from "../contents/TrickDetail/TrickDetail";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Library /> },
      { path: ROUTE_FAVORITES, element: <Library favoritesOnly /> },
      { path: ROUTE_TRICK, element: <TrickDetail /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
```

- [ ] **Step 5: Remove dead plumbing.** Delete `apps/web/src/contents/Home/HomeRedirect.tsx`. Remove `getTricks` from `trickAPI.ts`; remove `doGetTricks` and `doOpenFirstTrick` (and their now-unused imports: `NavigateFunction`, `ITrickSummary`, `getTricks`, `toTrickPath`) from `trickBusiness.ts`; remove `tricks`, `setTricks` from `useTrick.ts` (interface + initial state + setter) and `tricks: []` from the `setState` call in `useTrick.test.ts`. Verify with `bunx biome check apps/web` and `bun run typecheck` that nothing still references them.

- [ ] **Step 6: Verify**

Run:

```bash
bunx biome check --write apps/web
bun run typecheck
bun run --cwd apps/web test
```

Expected: PASS. Then start the dev server (`bun run --cwd apps/web dev`), `curl -s http://localhost:5173/src/contents/Library/Library.tsx | head -3` must return transformed JS (no compile error); stop the server. Do not claim visual checks.

Note: the existing E2E suite now fails its first test (`/` no longer redirects); Task 12 adapts it. Do not run or edit E2E here.

- [ ] **Step 7: Leave changes uncommitted.**

---

### Task 10: Trick detail — routine switcher, text-only routines, cross-links

**Files:**
- Create: `apps/web/src/components/RoutineSwitcher/RoutineSwitcher.tsx`, `apps/web/src/components/StaticPhaseViewer/StaticPhaseViewer.tsx`
- Rewrite: `apps/web/src/components/TrickHero/TrickHero.tsx`, `apps/web/src/components/TechniqueList/TechniqueList.tsx`, `apps/web/src/contents/TrickDetail/TrickDetail.tsx`
- Modify: `apps/web/src/business/trickBusiness.ts` (`doGetTrick` → `doOpenTrick`)
- Modify: `en.json`, `id.json`

**Interfaces:**
- Consumes: `isVisualRoutine` (Task 7), `loadStatic`-aware `doGetRoutine` (Task 7), `toTrickPath`, `toTechniquePath`, `toItemPath` (Task 9), `IRoutineDetail.items` (Task 5).
- Produces:
  - `doOpenTrick(trickId: string, routineId: string | null)` — loads the trick, then the requested routine if it belongs to the trick, otherwise the default routine.
  - URL `/tricks/:id?routine=<routineId>` selects the routine; `RoutineSwitcher` (fieldset "Routines", buttons with `aria-pressed`, named by routine name, "(Default)" suffix) is shown when a trick has more than one routine.
  - Text-only routines render `StaticPhaseViewer` (section "Interactive Visualization", note "Visualization not available yet for this routine.", step badge, ViewToggle, explanation, PhaseStrip) instead of `Visualizer`; the hero hides "Start Visualizer" for them.
  - Technique names in "Techniques in this phase" and item names in "Gimmicks & props" are links to their detail pages; hero pills and the items panel use the **selected routine's** items.

- [ ] **Step 1: i18n.** Add to `en.json`: `"routines": { "title": "Routines", "default": "Default" }` and `visualizer.unavailable: "Visualization not available yet for this routine."`. Add to `id.json`: `"routines": { "title": "Routine", "default": "Bawaan" }` and `visualizer.unavailable: "Visualisasi belum tersedia untuk routine ini."`.

- [ ] **Step 2: Business.** In `apps/web/src/business/trickBusiness.ts` replace `doGetTrick` with:

```ts
export const doOpenTrick = async (trickId: string, routineId: string | null): Promise<void> => {
  const { setTrick, setIsLoading, setError } = useTrickStore.getState();
  try {
    setIsLoading(true);
    setError(null);
    const trick = await getTrick(trickId);
    setTrick(trick);
    const selectedId =
      trick.routines.find((routine) => routine.id === routineId)?.id ?? trick.defaultRoutineId;
    if (selectedId) await doGetRoutine(selectedId);
  } catch (error) {
    setError(handleError(error));
  } finally {
    setIsLoading(false);
  }
};
```

- [ ] **Step 3: New components.**

`apps/web/src/components/RoutineSwitcher/RoutineSwitcher.tsx`:

```tsx
import { useTranslation } from "react-i18next";

import type { IRoutineSummary } from "@sleightbook/shared/schemas/trick";

interface RoutineSwitcherProps {
  routines: IRoutineSummary[];
  selectedId: string;
  onSelect: (routineId: string) => void;
}

export const RoutineSwitcher = ({ routines, selectedId, onSelect }: RoutineSwitcherProps) => {
  const { t } = useTranslation();
  return (
    <fieldset aria-label={t("routines.title")} className="mb-4 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs uppercase tracking-widest text-subtle">{t("routines.title")}</span>
      {routines.map((routine) => (
        <button
          key={routine.id}
          type="button"
          aria-pressed={routine.id === selectedId}
          onClick={() => onSelect(routine.id)}
          className={`rounded-md border px-3 py-1.5 text-sm ${
            routine.id === selectedId
              ? "border-gold-dim bg-gold-deep text-gold-2"
              : "border-line bg-panel-2 text-muted hover:border-gold-dim hover:text-fg"
          }`}
        >
          {routine.name}
          {routine.isDefault && <span className="ml-1.5 text-xs text-subtle">({t("routines.default")})</span>}
          {routine.hasVisualization && (
            <span aria-hidden="true" className="ml-1.5 text-gold">
              ▶
            </span>
          )}
        </button>
      ))}
    </fieldset>
  );
};
```

`apps/web/src/components/StaticPhaseViewer/StaticPhaseViewer.tsx`:

```tsx
import { useTranslation } from "react-i18next";

import type { IPhase } from "@sleightbook/shared/schemas/routine";

import { useVisualizerShortcuts } from "../../hooks/useVisualizerShortcuts";
import { usePlayerStore } from "../../store/usePlayer";
import { PhaseStrip } from "../PhaseStrip/PhaseStrip";
import { ViewToggle } from "../ViewToggle/ViewToggle";

interface StaticPhaseViewerProps {
  phases: IPhase[];
}

export const StaticPhaseViewer = ({ phases }: StaticPhaseViewerProps) => {
  const { t } = useTranslation();
  const { phaseIndex, view } = usePlayerStore();
  useVisualizerShortcuts();
  const activePhase = phases[phaseIndex];

  return (
    <section
      id="visualizer"
      aria-labelledby="static-viewer-title"
      className="scroll-mt-6 rounded-xl border border-line bg-panel p-3.5"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="static-viewer-title" className="text-sm font-semibold">
          {t("visualizer.title")}
        </h2>
        <div className="flex items-center gap-2">
          <ViewToggle />
          <span className="rounded border border-line px-2 py-1 text-xs text-muted">
            {t("visualizer.step", { current: phaseIndex + 1, total: phases.length })}
          </span>
        </div>
      </div>
      <p className="rounded-lg border border-dashed border-gold-dim bg-gold-deep/40 px-3 py-6 text-center text-sm text-gold-2">
        {t("visualizer.unavailable")}
      </p>
      {activePhase && (
        <p aria-live="polite" className="mt-3 text-sm text-muted">
          <strong className="block text-fg">
            {phaseIndex + 1}. {activePhase.name}
          </strong>
          {view === "secret" ? activePhase.explanation : activePhase.spectatorText}
        </p>
      )}
      <PhaseStrip phases={phases} />
    </section>
  );
};
```

`apps/web/src/components/TechniqueList/TechniqueList.tsx` (rewrite — names become links):

```tsx
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { ITechnique } from "@sleightbook/shared/schemas/routine";

import { toTechniquePath } from "../../constants/routes";
import { Panel } from "../Panel/Panel";

interface TechniqueListProps {
  techniques: ITechnique[];
}

export const TechniqueList = ({ techniques }: TechniqueListProps) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("techniques.title")}>
      {techniques.length === 0 ? (
        <p className="text-sm text-muted">{t("techniques.none")}</p>
      ) : (
        <ul className="space-y-3">
          {techniques.map((technique) => (
            <li key={technique.id} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden="true"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-line-2 bg-panel-2 text-gold"
              >
                ◈
              </span>
              <div>
                <p className="text-fg">
                  <Link to={toTechniquePath(technique.id)} className="underline-offset-2 hover:text-gold-2 hover:underline">
                    {technique.name}
                  </Link>{" "}
                  <span className="text-xs text-subtle">· {technique.category}</span>
                </p>
                <p className="text-xs text-muted">{technique.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
```

`apps/web/src/components/TrickHero/TrickHero.tsx` (rewrite — items and visualizer availability come from the selected routine):

```tsx
import { useTranslation } from "react-i18next";

import type { IItem, ITrickDetail } from "@sleightbook/shared/schemas/trick";

interface TrickHeroProps {
  trick: ITrickDetail;
  items: IItem[];
  canVisualize: boolean;
  onStartVisualizer: () => void;
  onToggleFavorite: () => void;
}

export const TrickHero = ({ trick, items, canVisualize, onStartVisualizer, onToggleFavorite }: TrickHeroProps) => {
  const { t } = useTranslation();
  const favoriteLabel = trick.isFavorite ? t("hero.unfavorite") : t("hero.favorite");

  return (
    <section className="mb-4 grid overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl md:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col justify-center gap-3 p-6">
        <span className="self-start rounded border border-gold-dim bg-gold-deep px-2 py-1 text-xs uppercase tracking-wide text-gold-2">
          {t(`category.${trick.category}`)}
        </span>
        <h1 className="text-3xl font-bold tracking-tight">{trick.name}</h1>
        <p className="max-w-prose text-sm text-muted">{trick.description}</p>
        <ul className="flex flex-wrap gap-2 text-xs text-muted">
          <li className="rounded-full border border-line bg-panel-2 px-3 py-1">{t(`difficulty.${trick.difficulty}`)}</li>
          <li className="rounded-full border border-line bg-panel-2 px-3 py-1">
            {t("hero.duration", { min: trick.durationMin, max: trick.durationMax })}
          </li>
          {items.map((item) => (
            <li key={item.id} className="rounded-full border border-line bg-panel-2 px-3 py-1">
              {item.name}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          {canVisualize && (
            <button type="button" onClick={onStartVisualizer} className="btn-primary">
              {t("hero.startVisualizer")} ▶
            </button>
          )}
          <button
            type="button"
            aria-pressed={trick.isFavorite}
            aria-label={favoriteLabel}
            title={favoriteLabel}
            onClick={onToggleFavorite}
            className={`btn-secondary ${trick.isFavorite ? "text-gold-2" : ""}`}
          >
            <span aria-hidden="true">{trick.isFavorite ? "♥" : "♡"}</span>
          </button>
        </div>
      </div>
      <HeroArt />
    </section>
  );
};

const HeroArt = () => (
  <div
    aria-hidden="true"
    className="relative hidden min-h-56 overflow-hidden bg-[radial-gradient(circle_at_50%_48%,var(--color-gold-dim)_0,var(--color-gold-deep)_25%,var(--color-panel)_65%)] md:block"
  >
    <div className="absolute left-1/2 top-[57%] h-36 w-26 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-lg border border-line-2 bg-card-back shadow-2xl" />
    <div className="absolute left-1/2 top-1/2 grid h-34 w-24 -translate-x-1/2 -translate-y-1/2 rotate-6 place-items-center rounded-lg border border-subtle bg-card-face text-4xl font-extrabold text-card-ink shadow-2xl">
      ♠
    </div>
  </div>
);
```

- [ ] **Step 4: Rewrite `apps/web/src/contents/TrickDetail/TrickDetail.tsx`:**

```tsx
import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { Link, useParams, useSearchParams } from "react-router";

import type { IItem, ITrickDetail } from "@sleightbook/shared/schemas/trick";

import { usePlayerStore } from "../../store/usePlayer";
import { useRoutineStore } from "../../store/useRoutine";
import { useTrickStore } from "../../store/useTrick";
import { doOpenTrick, doToggleFavorite } from "../../business/trickBusiness";
import { NotesPanel } from "../../components/NotesPanel/NotesPanel";
import { Panel } from "../../components/Panel/Panel";
import { PhaseBreakdown } from "../../components/PhaseBreakdown/PhaseBreakdown";
import { RoutineSwitcher } from "../../components/RoutineSwitcher/RoutineSwitcher";
import { StaticPhaseViewer } from "../../components/StaticPhaseViewer/StaticPhaseViewer";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { TechniqueList } from "../../components/TechniqueList/TechniqueList";
import { TrickHero } from "../../components/TrickHero/TrickHero";
import { Visualizer } from "../../components/Visualizer/Visualizer";
import { toItemPath } from "../../constants/routes";
import { isVisualRoutine } from "../../utils/routine";

export const TrickDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const routineParam = searchParams.get("routine");
  const { trick, error } = useTrickStore();
  const { routine, error: routineError } = useRoutineStore();
  const { phaseIndex, replay } = usePlayerStore();

  useEffect(() => {
    if (id) void doOpenTrick(id, routineParam);
  }, [id, routineParam]);

  const handleStartVisualizer = () => {
    document.getElementById("visualizer")?.scrollIntoView({ behavior: "smooth", block: "center" });
    replay();
  };
  const handleToggleFavorite = () => {
    void doToggleFavorite();
  };
  const handleRetry = () => {
    if (id) void doOpenTrick(id, routineParam);
  };
  const handleRoutineSelect = (routineId: string) => setSearchParams({ routine: routineId });

  if (error && trick?.id !== id) {
    return <StatusMessage message={error} actionLabel={t("app.retry")} onAction={handleRetry} />;
  }
  if (trick && trick.id === id && (routineError || trick.defaultRoutineId === null)) {
    return (
      <StatusMessage message={routineError ?? t("errors.generic")} actionLabel={t("app.retry")} onAction={handleRetry} />
    );
  }
  if (!trick || trick.id !== id || !routine || routine.trickId !== trick.id) {
    return <StatusMessage message={t("app.loading")} />;
  }

  const activePhase = routine.phases[phaseIndex];
  const isVisual = isVisualRoutine(routine);

  return (
    <>
      <TrickHero
        trick={trick}
        items={routine.items}
        canVisualize={isVisual}
        onStartVisualizer={handleStartVisualizer}
        onToggleFavorite={handleToggleFavorite}
      />
      {trick.routines.length > 1 && (
        <RoutineSwitcher routines={trick.routines} selectedId={routine.id} onSelect={handleRoutineSelect} />
      )}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {isVisual ? <Visualizer phases={routine.phases} /> : <StaticPhaseViewer phases={routine.phases} />}
          <PhaseBreakdown phases={routine.phases} />
        </div>
        <aside className="space-y-3">
          <TrickFacts trick={trick} phaseCount={routine.phases.length} />
          <TechniqueList techniques={activePhase?.techniques ?? []} />
          <ItemList items={routine.items} />
          {routine.tips.length > 0 && <TipList tips={routine.tips} />}
          {activePhase && (
            <NotesPanel
              key={activePhase.id}
              title={t("notes.phaseTitle", { phase: activePhase.name })}
              notes={activePhase.notes}
              target={{ phaseId: activePhase.id }}
            />
          )}
          <NotesPanel title={t("notes.trickTitle")} notes={trick.notes} target={{ trickId: trick.id }} />
        </aside>
      </div>
    </>
  );
};

const TrickFacts = ({ trick, phaseCount }: { trick: ITrickDetail; phaseCount: number }) => {
  const { t } = useTranslation();
  const rows = [
    { label: t("details.category"), value: t(`category.${trick.category}`) },
    { label: t("details.difficulty"), value: t(`difficulty.${trick.difficulty}`) },
    { label: t("details.duration"), value: t("details.durationValue", { min: trick.durationMin, max: trick.durationMax }) },
    { label: t("details.phases"), value: String(phaseCount) },
  ];
  return (
    <Panel title={t("details.title")}>
      <dl className="grid gap-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3 border-b border-line pb-2 last:border-0">
            <dt className="text-subtle">{row.label}</dt>
            <dd className="text-right text-fg">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
};

const ItemList = ({ items }: { items: IItem[] }) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("items.title")}>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{t("items.none")}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item.id} className="rounded-md border border-gold-dim/50 bg-panel-2 p-2.5">
              <p className="text-fg">
                <Link to={toItemPath(item.id)} className="underline-offset-2 hover:text-gold-2 hover:underline">
                  {item.name}
                </Link>{" "}
                <span className="text-xs text-subtle">· {t(`items.${item.kind}`)}</span>
              </p>
              {item.setupNotes && <p className="text-xs text-muted">{item.setupNotes}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};

const TipList = ({ tips }: { tips: string[] }) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("tips.title")}>
      <ul className="space-y-2 text-sm text-muted">
        {tips.map((tip) => (
          <li key={tip} className="flex gap-2">
            <span aria-hidden="true" className="text-gold">
              ✓
            </span>
            {tip}
          </li>
        ))}
      </ul>
    </Panel>
  );
};
```

(If the current file differs from this in small ways introduced by the MVP1 fix wave — e.g. the routine-error branch — keep the behaviour shown here; it already includes that fix.)

- [ ] **Step 5: Verify**

Run: `bunx biome check --write apps/web && bun run typecheck && bun run --cwd apps/web test` → Expected: PASS. Start the dev server, `curl` `/src/contents/TrickDetail/TrickDetail.tsx` for a clean transform, stop it.

- [ ] **Step 6: Leave changes uncommitted.**

---

### Task 11: Technique & Item pages

**Files:**
- Create: `apps/web/src/components/UsageList/UsageList.tsx`
- Create: `apps/web/src/contents/TechniqueLibrary/TechniqueLibrary.tsx`, `apps/web/src/contents/TechniqueDetail/TechniqueDetail.tsx`, `apps/web/src/contents/ItemLibrary/ItemLibrary.tsx`, `apps/web/src/contents/ItemDetail/ItemDetail.tsx`
- Modify: `apps/web/src/routes/router.tsx`, `en.json`, `id.json`

**Interfaces:**
- Consumes: `doGetTechniques/doGetTechnique/doGetItems/doGetItem`, `useTechniqueStore`, `useItemStore` (Task 7); `NotesPanel` with `techniqueId`/`itemId` targets; route constants (Task 9).
- Produces: `/techniques`, `/techniques/:id`, `/items`, `/items/:id`. Accessible names used by E2E: `h1` = page title / technique or item name; region "Used in" containing links named `"<Trick> — <Routine>"`; notes region "Your notes on this technique" / "Your notes on this item" with the standard NotesPanel controls.

- [ ] **Step 1: i18n.** Add to `en.json`:

```json
"techniqueLibrary": {
  "title": "Technique Library",
  "subtitle": "Reusable sleights, counts and controls.",
  "usage_one": "Used in {{count}} routine",
  "usage_other": "Used in {{count}} routines",
  "back": "All techniques",
  "tips": "Tips",
  "mistakes": "Common mistakes",
  "none": "Nothing listed yet.",
  "notes": "Your notes on this technique"
},
"itemLibrary": {
  "title": "Gimmicks & Props",
  "subtitle": "Everything your routines need on the table.",
  "usage_one": "Used in {{count}} routine",
  "usage_other": "Used in {{count}} routines",
  "back": "All gimmicks & props",
  "setup": "Setup notes",
  "notes": "Your notes on this item"
},
"usage": { "title": "Used in", "none": "Not used in any routine yet.", "phases": "Phases: {{phases}}" }
```

and to `id.json`:

```json
"techniqueLibrary": {
  "title": "Pustaka Teknik",
  "subtitle": "Sleight, count, dan kontrol yang bisa dipakai ulang.",
  "usage_one": "Dipakai di {{count}} routine",
  "usage_other": "Dipakai di {{count}} routine",
  "back": "Semua teknik",
  "tips": "Tips",
  "mistakes": "Kesalahan umum",
  "none": "Belum ada.",
  "notes": "Catatanmu tentang teknik ini"
},
"itemLibrary": {
  "title": "Gimmick & Properti",
  "subtitle": "Semua yang dibutuhkan routine-mu di meja.",
  "usage_one": "Dipakai di {{count}} routine",
  "usage_other": "Dipakai di {{count}} routine",
  "back": "Semua gimmick & properti",
  "setup": "Catatan persiapan",
  "notes": "Catatanmu tentang item ini"
},
"usage": { "title": "Dipakai di", "none": "Belum dipakai di routine mana pun.", "phases": "Fase: {{phases}}" }
```

- [ ] **Step 2: Components & pages.**

`apps/web/src/components/UsageList/UsageList.tsx`:

```tsx
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import type { IUsage } from "@sleightbook/shared/schemas/usage";

import { toTrickPath } from "../../constants/routes";
import { Panel } from "../Panel/Panel";

interface UsageListProps {
  usages: IUsage[];
}

export const UsageList = ({ usages }: UsageListProps) => {
  const { t } = useTranslation();
  return (
    <Panel title={t("usage.title")}>
      {usages.length === 0 ? (
        <p className="text-sm text-muted">{t("usage.none")}</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {usages.map((usage) => (
            <li key={usage.routineId} className="rounded-md border border-line bg-panel-2 p-2.5">
              <Link
                to={toTrickPath(usage.trickId, usage.routineId)}
                className="text-fg underline-offset-2 hover:text-gold-2 hover:underline"
              >
                {`${usage.trickName} — ${usage.routineName}`}
              </Link>
              {usage.phaseNames.length > 0 && (
                <p className="text-xs text-muted">{t("usage.phases", { phases: usage.phaseNames.join(", ") })}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
```

`apps/web/src/contents/TechniqueLibrary/TechniqueLibrary.tsx`:

```tsx
import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useTechniqueStore } from "../../store/useTechnique";
import { doGetTechniques } from "../../business/techniqueBusiness";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { toTechniquePath } from "../../constants/routes";

export const TechniqueLibrary = () => {
  const { t } = useTranslation();
  const { techniques, isLoading, error } = useTechniqueStore();

  useEffect(() => {
    void doGetTechniques();
  }, []);

  const handleRetry = () => {
    void doGetTechniques();
  };

  if (error) return <StatusMessage message={error} actionLabel={t("app.retry")} onAction={handleRetry} />;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("techniqueLibrary.title")}</h1>
        <p className="text-sm text-muted">{t("techniqueLibrary.subtitle")}</p>
      </div>
      {isLoading && techniques.length === 0 ? (
        <StatusMessage message={t("app.loading")} />
      ) : (
        <ul aria-label={t("techniqueLibrary.title")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {techniques.map((technique) => (
            <li key={technique.id} className="relative rounded-xl border border-line bg-panel p-4 hover:border-gold-dim">
              <h2 className="text-base font-semibold">
                <Link to={toTechniquePath(technique.id)} className="after:absolute after:inset-0 after:content-[''] hover:text-gold-2">
                  {technique.name}
                </Link>
              </h2>
              <p className="text-xs text-muted">
                {technique.category} · {t(`difficulty.${technique.difficulty}`)}
              </p>
              <p className="mt-2 text-xs text-subtle">{t("techniqueLibrary.usage", { count: technique.usageCount })}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
```

`apps/web/src/contents/TechniqueDetail/TechniqueDetail.tsx`:

```tsx
import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useTechniqueStore } from "../../store/useTechnique";
import { doGetTechnique } from "../../business/techniqueBusiness";
import { NotesPanel } from "../../components/NotesPanel/NotesPanel";
import { Panel } from "../../components/Panel/Panel";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { UsageList } from "../../components/UsageList/UsageList";

export const TechniqueDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { technique, error } = useTechniqueStore();

  useEffect(() => {
    if (id) void doGetTechnique(id);
  }, [id]);

  const handleRetry = () => {
    if (id) void doGetTechnique(id);
  };

  if (error && technique?.id !== id) {
    return <StatusMessage message={error} actionLabel={t("app.retry")} onAction={handleRetry} />;
  }
  if (!technique || technique.id !== id) return <StatusMessage message={t("app.loading")} />;

  return (
    <>
      <Link to="/techniques" className="text-sm text-muted hover:text-gold-2">
        ← {t("techniqueLibrary.back")}
      </Link>
      <header className="my-4">
        <span className="rounded border border-gold-dim bg-gold-deep px-2 py-1 text-xs uppercase tracking-wide text-gold-2">
          {technique.category}
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{technique.name}</h1>
        <p className="text-sm text-muted">{t(`difficulty.${technique.difficulty}`)}</p>
        <p className="mt-2 max-w-prose text-sm text-muted">{technique.description}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Panel title={t("techniqueLibrary.tips")}>
            <TextList entries={technique.tips} emptyText={t("techniqueLibrary.none")} />
          </Panel>
          <Panel title={t("techniqueLibrary.mistakes")}>
            <TextList entries={technique.commonMistakes} emptyText={t("techniqueLibrary.none")} />
          </Panel>
          <UsageList usages={technique.usedIn} />
        </div>
        <aside>
          <NotesPanel
            key={technique.id}
            title={t("techniqueLibrary.notes")}
            notes={technique.notes}
            target={{ techniqueId: technique.id }}
          />
        </aside>
      </div>
    </>
  );
};

const TextList = ({ entries, emptyText }: { entries: string[]; emptyText: string }) =>
  entries.length === 0 ? (
    <p className="text-sm text-muted">{emptyText}</p>
  ) : (
    <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
      {entries.map((entry) => (
        <li key={entry}>{entry}</li>
      ))}
    </ul>
  );
```

`apps/web/src/contents/ItemLibrary/ItemLibrary.tsx`:

```tsx
import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useItemStore } from "../../store/useItem";
import { doGetItems } from "../../business/itemBusiness";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { toItemPath } from "../../constants/routes";

export const ItemLibrary = () => {
  const { t } = useTranslation();
  const { items, isLoading, error } = useItemStore();

  useEffect(() => {
    void doGetItems();
  }, []);

  const handleRetry = () => {
    void doGetItems();
  };

  if (error) return <StatusMessage message={error} actionLabel={t("app.retry")} onAction={handleRetry} />;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">{t("itemLibrary.title")}</h1>
        <p className="text-sm text-muted">{t("itemLibrary.subtitle")}</p>
      </div>
      {isLoading && items.length === 0 ? (
        <StatusMessage message={t("app.loading")} />
      ) : (
        <ul aria-label={t("itemLibrary.title")} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="relative rounded-xl border border-line bg-panel p-4 hover:border-gold-dim">
              <h2 className="text-base font-semibold">
                <Link to={toItemPath(item.id)} className="after:absolute after:inset-0 after:content-[''] hover:text-gold-2">
                  {item.name}
                </Link>
              </h2>
              <p className="text-xs text-muted">{t(`items.${item.kind}`)}</p>
              <p className="mt-2 text-xs text-subtle">{t("itemLibrary.usage", { count: item.usageCount })}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
```

`apps/web/src/contents/ItemDetail/ItemDetail.tsx`:

```tsx
import { useEffect } from "react";

import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

import { useItemStore } from "../../store/useItem";
import { doGetItem } from "../../business/itemBusiness";
import { NotesPanel } from "../../components/NotesPanel/NotesPanel";
import { Panel } from "../../components/Panel/Panel";
import { StatusMessage } from "../../components/StatusMessage/StatusMessage";
import { UsageList } from "../../components/UsageList/UsageList";

export const ItemDetail = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { item, error } = useItemStore();

  useEffect(() => {
    if (id) void doGetItem(id);
  }, [id]);

  const handleRetry = () => {
    if (id) void doGetItem(id);
  };

  if (error && item?.id !== id) {
    return <StatusMessage message={error} actionLabel={t("app.retry")} onAction={handleRetry} />;
  }
  if (!item || item.id !== id) return <StatusMessage message={t("app.loading")} />;

  return (
    <>
      <Link to="/items" className="text-sm text-muted hover:text-gold-2">
        ← {t("itemLibrary.back")}
      </Link>
      <header className="my-4">
        <span className="rounded border border-gold-dim bg-gold-deep px-2 py-1 text-xs uppercase tracking-wide text-gold-2">
          {t(`items.${item.kind}`)}
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">{item.name}</h1>
        <p className="mt-2 max-w-prose text-sm text-muted">{item.description}</p>
      </header>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          {item.setupNotes && (
            <Panel title={t("itemLibrary.setup")}>
              <p className="text-sm text-muted">{item.setupNotes}</p>
            </Panel>
          )}
          <UsageList usages={item.usedIn} />
        </div>
        <aside>
          <NotesPanel key={item.id} title={t("itemLibrary.notes")} notes={item.notes} target={{ itemId: item.id }} />
        </aside>
      </div>
    </>
  );
};
```

`apps/web/src/routes/router.tsx` — add imports and routes:

```tsx
import {
  ROUTE_FAVORITES,
  ROUTE_ITEM,
  ROUTE_ITEMS,
  ROUTE_TECHNIQUE,
  ROUTE_TECHNIQUES,
  ROUTE_TRICK,
} from "../constants/routes";
import { ItemDetail } from "../contents/ItemDetail/ItemDetail";
import { ItemLibrary } from "../contents/ItemLibrary/ItemLibrary";
import { TechniqueDetail } from "../contents/TechniqueDetail/TechniqueDetail";
import { TechniqueLibrary } from "../contents/TechniqueLibrary/TechniqueLibrary";
```

and inside `children`, before the `"*"` route:

```tsx
      { path: ROUTE_TECHNIQUES, element: <TechniqueLibrary /> },
      { path: ROUTE_TECHNIQUE, element: <TechniqueDetail /> },
      { path: ROUTE_ITEMS, element: <ItemLibrary /> },
      { path: ROUTE_ITEM, element: <ItemDetail /> },
```

- [ ] **Step 3: Verify**

Run: `bunx biome check --write apps/web && bun run typecheck && bun run --cwd apps/web test` → Expected: PASS. Dev-server `curl` smoke check of `/src/contents/TechniqueDetail/TechniqueDetail.tsx`, then stop the server.

- [ ] **Step 4: Leave changes uncommitted.**

---

### Task 12: E2E (MVP1 adapted + Phase 2), README & final verification

**Files:**
- Modify: `apps/web/e2e/trickDetail.e2e.ts`
- Create: `apps/web/e2e/library.e2e.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: every accessible name listed in Tasks 9–11 and MVP1; `data-kind` values `packetBlock` / `mixedBlock` (Task 8).
- Produces: `bun run test:e2e` → 8 adapted MVP1 tests + 8 Phase 2 tests, all passing.

- [ ] **Step 1: Adapt the MVP1 suite** `apps/web/e2e/trickDetail.e2e.ts`:
1. Replace `openTrick` with:
   ```ts
   const openTrick = async (page: Page, name = "Ambitious Card") => {
     await page.goto("/");
     await page.getByRole("list", { name: "Tricks" }).getByRole("link", { name, exact: true }).click();
     await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
   };
   ```
2. Replace the first test with:
   ```ts
   test("library lists six tricks and opens Ambitious Card", async ({ page }) => {
     await page.goto("/");
     await expect(page.getByRole("heading", { level: 1, name: "Magic Library" })).toBeVisible();
     await expect(page.getByRole("list", { name: "Tricks" }).getByRole("listitem")).toHaveCount(6);
     await openTrick(page);
     await expect(page).toHaveURL(/\/tricks\/[0-9a-f-]{36}$/);
     await expect(page.getByText("Step 1 / 5")).toBeVisible();
   });
   ```
Everything else in the file stays unchanged.

- [ ] **Step 2: Write** `apps/web/e2e/library.e2e.ts`:

```ts
import { expect, type Page, test } from "@playwright/test";

const tricksList = (page: Page) => page.getByRole("list", { name: "Tricks" });
const cardTitles = (page: Page) => tricksList(page).getByRole("heading", { level: 3 });

const openTrick = async (page: Page, name: string) => {
  await page.goto("/");
  await tricksList(page).getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
};

const phaseButton = (page: Page, name: string) =>
  page.getByRole("list", { name: "Phases" }).getByRole("button", { name: new RegExp(name) });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("sleightbook.language", "en");
  });
});

test("search finds tricks by technique name", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox", { name: "Search tricks" }).fill("elmsley");
  await expect(cardTitles(page)).toHaveText(["Ambitious Card", "Oil & Water"]);
  await expect(page).toHaveURL(/\?q=elmsley/);
});

test("category filter narrows the library", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Coin", exact: true }).click();
  await expect(cardTitles(page)).toHaveText(["Coin Matrix"]);
});

test("top bar search opens filtered results", async ({ page }) => {
  await page.goto("/techniques");
  const search = page.getByRole("searchbox", { name: "Search the library" });
  await search.fill("thread");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/\?q=thread$/);
  await expect(cardTitles(page)).toHaveText(["Rising Card"]);
});

test("a card favorite appears on the Favorites page", async ({ page }) => {
  await page.goto("/");
  const favorite = page.getByRole("button", { name: "Favorite Triumph" });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "Favorites" }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Favorites" })).toBeVisible();
  await expect(cardTitles(page)).toHaveText(["Triumph"]);
});

test("switching routines swaps the visualizer for the text-only viewer", async ({ page }) => {
  await openTrick(page, "Ambitious Card");
  await page.getByRole("button", { name: "Elmsley Version" }).click();
  await expect(page.getByText("Visualization not available yet for this routine.")).toBeVisible();
  await expect(page).toHaveURL(/\?routine=/);
  await expect(page.getByText("Step 1 / 3")).toBeVisible();
  await page.getByRole("button", { name: "Standard" }).click();
  await expect(page.getByText("Step 1 / 5")).toBeVisible();
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
});

test("technique links lead to a detail page that links back", async ({ page }) => {
  await openTrick(page, "Ambitious Card");
  await phaseButton(page, "Double Lift").click();
  await page
    .getByRole("region", { name: "Techniques in this phase" })
    .getByRole("link", { name: "Double Lift" })
    .click();
  await expect(page.getByRole("heading", { level: 1, name: "Double Lift" })).toBeVisible();
  const usedIn = page.getByRole("region", { name: "Used in" });
  await expect(usedIn.getByRole("link", { name: "Ambitious Card — Standard" })).toBeVisible();
  await usedIn.getByRole("link", { name: "Ambitious Card — Top Change Version" }).click();
  await expect(page.getByRole("button", { name: "Top Change Version" })).toHaveAttribute("aria-pressed", "true");
});

test("technique notes persist after reload", async ({ page }) => {
  const body = `Technique note ${Date.now()}`;
  await page.goto("/techniques");
  await page.getByRole("link", { name: "Elmsley Count" }).click();
  const notes = page.getByRole("region", { name: "Your notes on this technique" });
  await notes.getByRole("textbox", { name: "Write a note" }).fill(body);
  await notes.getByRole("button", { name: "Add note" }).click();
  await expect(notes.getByText(body)).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Your notes on this technique" }).getByText(body)).toBeVisible();
});

test("Triumph: secret view shows two intact halves, spectator sees a mixed deck", async ({ page }) => {
  await openTrick(page, "Triumph");
  await phaseButton(page, "The Shuffle").click();
  await expect(page.locator('[data-kind="packetBlock"]')).toHaveCount(2);
  await expect(page.locator('[data-kind="mixedBlock"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Spectator", exact: true }).click();
  await expect(page.locator('[data-kind="mixedBlock"]')).toHaveCount(1);
  await expect(page.locator('[data-kind="packetBlock"]')).toHaveCount(0);
});
```

- [ ] **Step 3: Run the E2E suites**

Run: `bun run test:e2e`
Expected: 16 passed. On failure: read the trace (`bunx playwright show-report` in `apps/web`), fix the root cause minimally in the app (keep accessible names) or, if a selector is wrong for the specified UI, in the test — never weaken an assertion. Document every fix in the report.

- [ ] **Step 4: Update `README.md`** — replace the "Status" blockquote with:

```markdown
> Status: MVP1 + Phase 2 — a 6-trick library (search, filters, favorites), technique and gimmick pages,
> routine variations, and visualizers for Ambitious Card and Triumph. Data is stored locally in the browser
> (`localStorage`, key `sleightbook.db.v2`); the API/database (Part 2) is postponed.
```

and in "Develop" change the reset hint to: "to reset local data, clear the site's localStorage (keys starting with `sleightbook.db`)".

- [ ] **Step 5: Final verification**

Run:

```bash
bun run check
bun run test:e2e
git status --short
git log
```

Expected: `check` and `test:e2e` exit 0; `git log` reports no commits.

- [ ] **Step 6: Leave changes uncommitted.** Report the outputs.
