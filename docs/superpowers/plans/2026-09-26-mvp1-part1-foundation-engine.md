# Sleightbook MVP1 — Part 1: Foundation, Shared Schemas & Visualization Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the Bun monorepo and build `packages/shared` (Zod schemas + Ambitious Card fixture) and `packages/engine` (pure visualization engine: reducer, timeline, spectator/secret projection, layout).

**Architecture:** Bun workspaces monorepo. `shared` depends only on zod; `engine` depends only on `shared`; both are pure TypeScript, tested with `bun test`, no DOM, no I/O. Packages expose files via subpath exports (`@sleightbook/shared/schemas/action`) — no barrel files.

**Tech Stack:** Bun 1.3, TypeScript (strict), Zod 4, Biome.

**Spec:** [`docs/superpowers/specs/2026-09-26-sleightbook-mvp1-design.md`](../specs/2026-09-26-sleightbook-mvp1-design.md)

**Series:** Part 1 (this) → [Part 2: API](2026-09-26-mvp1-part2-api.md) → [Part 3: Web & E2E](2026-09-26-mvp1-part3-web.md)

## Global Constraints

- **NO GIT COMMITS.** The repo is `git init`-ed but the user forbids committing until they say so (spec D8). Every task ends with "leave changes uncommitted" instead of a commit step.
- TypeScript: `strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax` (forces `import type`).
- Naming (CONVENTIONS): interfaces `I*`, type aliases `T*`, constants `SCREAMING_SNAKE_CASE`, named exports only (config files that tools require as default export are the only exception), no `index.ts` barrels, no `any`.
- Import package code by subpath: `@sleightbook/shared/schemas/action`, `@sleightbook/engine/timeline`.
- Engine is pure: no React, no DOM, no `Date.now()`, no randomness.
- Dependency versions: latest stable at install time (`bun add <pkg>` without version).
- Seed labels: selected card `AH` (A♥), indifferent card `7C` (7♣) — the spec's `X` is realized as `7C`.

## File Map

```text
package.json                     root workspace + scripts
tsconfig.base.json               shared compiler options
biome.json                       lint/format config
.gitignore
docker-compose.yml               Postgres 16 on host port 5433 (used in Part 2)
docker/init/01-test-db.sql       creates sleightbook_test
packages/shared/
  package.json, tsconfig.json
  src/schemas/enums.ts           CATEGORIES, DIFFICULTIES, ITEM_KINDS
  src/schemas/action.ts          ActionSchema (discriminated union) + TAction
  src/schemas/note.ts            NoteSchema, CreateNoteSchema, UpdateNoteSchema, NOTE_TARGET_KEYS
  src/schemas/trick.ts           ItemSchema, TrickSummarySchema, TrickDetailSchema, UpdateTrickSchema
  src/schemas/routine.ts         TechniqueSchema, ActionRecordSchema, PhaseSchema, RoutineDetailSchema
  src/schemas/error.ts           ApiErrorSchema
  src/fixtures/ambitiousCard.ts  AMBITIOUS_CARD seed/test fixture
  src/**/*.test.ts
packages/engine/
  package.json, tsconfig.json
  src/types.ts                   ICard, ISceneState, ITimeline, IProjectedScene, IRenderNode, …
  src/errors.ts                  EngineError, TEngineErrorCode
  src/scene.ts                   createEmptyScene, applyAction
  src/timeline.ts                buildTimeline, validateRoutine, stateAt
  src/project.ts                 project
  src/layout.ts                  layout + stage constants
  src/**/*.test.ts
```

---

### Task 1: Monorepo scaffold & tooling

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `biome.json`, `.gitignore`, `docker-compose.yml`, `docker/init/01-test-db.sql`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`

**Interfaces:**
- Produces: workspace names `@sleightbook/shared`, `@sleightbook/engine`; root scripts `lint`, `typecheck`, `test`, `check`; Postgres at `localhost:5433` user/password/db `sleightbook`, test db `sleightbook_test`.

- [ ] **Step 1: Verify prerequisites**

Run: `bun --version` → Expected: `1.3.x` or newer.
Run: `git -C . status` → Expected: `No commits yet on main`.

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "sleightbook",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "concurrently -n api,web -c yellow,cyan \"bun run --cwd apps/api dev\" \"bun run --cwd apps/web dev\"",
    "db:up": "docker compose up -d --wait",
    "db:down": "docker compose down",
    "db:migrate": "bun run --cwd apps/api db:migrate",
    "db:seed": "bun run --cwd apps/api db:seed",
    "test": "bun run --filter \"@sleightbook/*\" test",
    "test:e2e": "bun run --cwd apps/web test:e2e",
    "lint": "biome check .",
    "format": "biome check --write .",
    "typecheck": "bun run --filter \"@sleightbook/*\" typecheck",
    "check": "bun run lint && bun run typecheck && bun run test"
  }
}
```

- [ ] **Step 3: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["bun"],
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

- [ ] **Step 4: Create `.gitignore`**

```gitignore
node_modules/
dist/
.env
.env.local
*.log
apps/web/test-results/
apps/web/playwright-report/
.DS_Store
```

(`.env.example` and `apps/api/.env.test` are intentionally tracked.)

- [ ] **Step 5: Create `docker-compose.yml` and init script**

`docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: sleightbook
      POSTGRES_PASSWORD: sleightbook
      POSTGRES_DB: sleightbook
    ports:
      - "5433:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sleightbook"]
      interval: 2s
      timeout: 3s
      retries: 20

volumes:
  pgdata: {}
```

`docker/init/01-test-db.sql`:

```sql
CREATE DATABASE sleightbook_test;
```

- [ ] **Step 6: Create package manifests and tsconfigs**

`packages/shared/package.json`:

```json
{
  "name": "@sleightbook/shared",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { "./*": "./src/*.ts" },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

`packages/engine/package.json`:

```json
{
  "name": "@sleightbook/engine",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { "./*": "./src/*.ts" },
  "dependencies": { "@sleightbook/shared": "workspace:*" },
  "scripts": {
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

`packages/shared/tsconfig.json` and `packages/engine/tsconfig.json` (identical):

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

- [ ] **Step 7: Install dependencies**

Run:

```bash
bun add -d @biomejs/biome typescript @types/bun concurrently
bun add zod --cwd packages/shared
bun install
```

Expected: `bun.lock` created, no errors.

- [ ] **Step 8: Create `biome.json`**

```json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "includes": ["**", "!**/migrations/**", "!docs/**", "!**/bun.lock"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always" } },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "assist": { "actions": { "source": { "organizeImports": "off" } } }
}
```

(`organizeImports` is off because CONVENTIONS §8 prescribes its own import grouping.)

- [ ] **Step 9: Verify tooling**

Run: `bun run lint` → Expected: exits 0 ("Checked N files").
If Biome reports an unknown key, run `bunx biome migrate --write` and re-run.

- [ ] **Step 10: Leave changes uncommitted** (D8 — do not run `git commit`).

---

### Task 2: Shared enums & action schema

**Files:**
- Create: `packages/shared/src/schemas/enums.ts`
- Create: `packages/shared/src/schemas/action.ts`
- Test: `packages/shared/src/schemas/action.test.ts`

**Interfaces:**
- Produces:
  - `CATEGORIES`, `DIFFICULTIES`, `ITEM_KINDS` (readonly tuples) and `TCategory`, `TDifficulty`, `TItemKind`
  - `ActionSchema` (Zod discriminated union on `type`), `TAction`, `TActionType`

- [ ] **Step 1: Write the failing test**

`packages/shared/src/schemas/action.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { ActionSchema } from "./action";

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared/src/schemas/action.test.ts`
Expected: FAIL — `Cannot find module './action'`.

- [ ] **Step 3: Write the implementation**

`packages/shared/src/schemas/enums.ts`:

```ts
export const CATEGORIES = ["card", "coin", "mentalism", "gimmick"] as const;
export const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;
export const ITEM_KINDS = ["prop", "gimmick"] as const;

export type TCategory = (typeof CATEGORIES)[number];
export type TDifficulty = (typeof DIFFICULTIES)[number];
export type TItemKind = (typeof ITEM_KINDS)[number];
```

`packages/shared/src/schemas/action.ts`:

```ts
import { z } from "zod";

const EmptyParamsSchema = z.strictObject({});

export const ActionSchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("setupDeck"),
    params: z.strictObject({
      named: z
        .array(z.strictObject({ label: z.string().min(1).max(8) }))
        .min(1)
        .max(8),
      restCount: z.number().int().min(0).max(60),
    }),
  }),
  z.strictObject({
    type: z.literal("doubleLift"),
    params: z.strictObject({ count: z.number().int().min(2).max(4) }),
  }),
  z.strictObject({
    type: z.literal("turnOver"),
    params: z.strictObject({ target: z.enum(["lifted", "top"]) }),
  }),
  z.strictObject({ type: z.literal("replace"), params: EmptyParamsSchema }),
  z.strictObject({
    type: z.literal("takeTop"),
    params: z.strictObject({ count: z.number().int().min(1).max(4) }),
  }),
  z.strictObject({
    type: z.literal("insert"),
    params: z.strictObject({ depth: z.literal("middle") }),
  }),
  z.strictObject({ type: z.literal("square"), params: EmptyParamsSchema }),
  z.strictObject({ type: z.literal("snap"), params: EmptyParamsSchema }),
  z.strictObject({ type: z.literal("revealTop"), params: EmptyParamsSchema }),
  z.strictObject({ type: z.literal("spread"), params: EmptyParamsSchema }),
]);

export type TAction = z.infer<typeof ActionSchema>;
export type TActionType = TAction["type"];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/shared/src/schemas/action.test.ts`
Expected: PASS (20 tests).

- [ ] **Step 5: Leave changes uncommitted** (D8).

---

### Task 3: Shared domain & API schemas

**Files:**
- Create: `packages/shared/src/schemas/note.ts`, `trick.ts`, `routine.ts`, `error.ts`
- Test: `packages/shared/src/schemas/note.test.ts`, `packages/shared/src/schemas/routine.test.ts`

**Interfaces:**
- Consumes: `ActionSchema` (Task 2), `CATEGORIES`, `DIFFICULTIES`, `ITEM_KINDS` (Task 2).
- Produces:
  - `NOTE_TARGET_KEYS = ["trickId","routineId","phaseId","techniqueId","itemId"] as const`, `TNoteTargetKey`
  - `NoteSchema`/`INote`, `CreateNoteSchema`/`ICreateNoteInput`, `UpdateNoteSchema`/`IUpdateNoteInput`
  - `ItemSchema`/`IItem`, `TrickSummarySchema`/`ITrickSummary`, `RoutineSummarySchema`/`IRoutineSummary`, `TrickDetailSchema`/`ITrickDetail` (fields: summary + `description, durationMin, durationMax, items, routines, defaultRoutineId: string|null, notes`), `UpdateTrickSchema`/`IUpdateTrickInput`
  - `TechniqueSchema`/`ITechnique`, `ActionRecordSchema`/`IActionRecord` (`{ id, position, durationMs, action: TAction }`), `PhaseSchema`/`IPhase`, `RoutineDetailSchema`/`IRoutineDetail`
  - `ApiErrorSchema`/`IApiError` (`{ error: { code, message } }`)

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/schemas/note.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { CreateNoteSchema, UpdateNoteSchema } from "./note";

const ID_A = "00000000-0000-4000-8000-000000000001";
const ID_B = "00000000-0000-4000-8000-000000000002";

describe("CreateNoteSchema", () => {
  test("accepts exactly one target", () => {
    expect(CreateNoteSchema.safeParse({ body: "Slow down", phaseId: ID_A }).success).toBe(true);
    expect(CreateNoteSchema.safeParse({ body: "Slow down", trickId: ID_A }).success).toBe(true);
  });

  test("trims the body", () => {
    expect(CreateNoteSchema.parse({ body: "  Keep the break small  ", trickId: ID_A }).body).toBe(
      "Keep the break small",
    );
  });

  test("rejects zero targets", () => {
    expect(CreateNoteSchema.safeParse({ body: "Orphan" }).success).toBe(false);
  });

  test("rejects two targets", () => {
    expect(CreateNoteSchema.safeParse({ body: "Both", trickId: ID_A, phaseId: ID_B }).success).toBe(
      false,
    );
  });

  test("rejects blank body and non-uuid target", () => {
    expect(CreateNoteSchema.safeParse({ body: "   ", trickId: ID_A }).success).toBe(false);
    expect(CreateNoteSchema.safeParse({ body: "x", trickId: "abc" }).success).toBe(false);
  });

  test("rejects unknown keys", () => {
    expect(CreateNoteSchema.safeParse({ body: "x", trickId: ID_A, userId: ID_B }).success).toBe(
      false,
    );
  });
});

describe("UpdateNoteSchema", () => {
  test("accepts a body and rejects extra keys", () => {
    expect(UpdateNoteSchema.safeParse({ body: "Edited" }).success).toBe(true);
    expect(UpdateNoteSchema.safeParse({ body: "Edited", phaseId: ID_A }).success).toBe(false);
  });
});
```

`packages/shared/src/schemas/routine.test.ts`:

```ts
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
      phases: [
        {
          id: ID,
          position: 0,
          name: "Double Lift",
          summary: "Secret handling",
          explanation: "Two cards as one",
          spectatorText: "The card is shown",
          actions: [{ id: ID, position: 0, durationMs: 800, action: { type: "doubleLift", params: { count: 2 } } }],
          techniques: [],
          notes: [],
        },
      ],
    };
    expect(RoutineDetailSchema.parse(routine).phases[0]?.actions[0]?.action.type).toBe("doubleLift");
  });

  test("rejects an unknown action inside a phase", () => {
    const bad = {
      id: ID,
      trickId: ID,
      name: "Standard",
      description: "",
      tips: [],
      phases: [
        {
          id: ID,
          position: 0,
          name: "X",
          summary: "",
          explanation: "",
          spectatorText: "",
          actions: [{ id: ID, position: 0, durationMs: 800, action: { type: "levitate", params: {} } }],
          techniques: [],
          notes: [],
        },
      ],
    };
    expect(RoutineDetailSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test packages/shared/src/schemas`
Expected: FAIL — `Cannot find module './note'` / `'./routine'`.

- [ ] **Step 3: Write the implementation**

`packages/shared/src/schemas/note.ts`:

```ts
import { z } from "zod";

export const NOTE_TARGET_KEYS = ["trickId", "routineId", "phaseId", "techniqueId", "itemId"] as const;
export type TNoteTargetKey = (typeof NOTE_TARGET_KEYS)[number];

export const NoteSchema = z.object({
  id: z.uuid(),
  body: z.string(),
  trickId: z.uuid().nullable(),
  routineId: z.uuid().nullable(),
  phaseId: z.uuid().nullable(),
  techniqueId: z.uuid().nullable(),
  itemId: z.uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type INote = z.infer<typeof NoteSchema>;

const NoteBodySchema = z.string().trim().min(1).max(5000);

export const CreateNoteSchema = z
  .strictObject({
    body: NoteBodySchema,
    trickId: z.uuid().optional(),
    routineId: z.uuid().optional(),
    phaseId: z.uuid().optional(),
    techniqueId: z.uuid().optional(),
    itemId: z.uuid().optional(),
  })
  .refine((input) => NOTE_TARGET_KEYS.filter((key) => input[key] !== undefined).length === 1, {
    message: "Exactly one note target is required",
  });
export type ICreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.strictObject({ body: NoteBodySchema });
export type IUpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
```

`packages/shared/src/schemas/trick.ts`:

```ts
import { z } from "zod";

import { CATEGORIES, DIFFICULTIES, ITEM_KINDS } from "./enums";
import { NoteSchema } from "./note";

export const ItemSchema = z.object({
  id: z.uuid(),
  kind: z.enum(ITEM_KINDS),
  name: z.string(),
  description: z.string(),
  setupNotes: z.string(),
});
export type IItem = z.infer<typeof ItemSchema>;

export const TrickSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.enum(CATEGORIES),
  difficulty: z.enum(DIFFICULTIES),
  isFavorite: z.boolean(),
});
export type ITrickSummary = z.infer<typeof TrickSummarySchema>;

export const RoutineSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  position: z.number().int(),
});
export type IRoutineSummary = z.infer<typeof RoutineSummarySchema>;

export const TrickDetailSchema = TrickSummarySchema.extend({
  description: z.string(),
  durationMin: z.number().int(),
  durationMax: z.number().int(),
  items: z.array(ItemSchema),
  routines: z.array(RoutineSummarySchema),
  defaultRoutineId: z.uuid().nullable(),
  notes: z.array(NoteSchema),
});
export type ITrickDetail = z.infer<typeof TrickDetailSchema>;

export const UpdateTrickSchema = z.strictObject({ isFavorite: z.boolean() });
export type IUpdateTrickInput = z.infer<typeof UpdateTrickSchema>;
```

`packages/shared/src/schemas/routine.ts`:

```ts
import { z } from "zod";

import { ActionSchema } from "./action";
import { DIFFICULTIES } from "./enums";
import { NoteSchema } from "./note";

export const TechniqueSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  category: z.string(),
  tips: z.array(z.string()),
  commonMistakes: z.array(z.string()),
});
export type ITechnique = z.infer<typeof TechniqueSchema>;

export const ActionRecordSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  durationMs: z.number().int().min(0).max(10000),
  action: ActionSchema,
});
export type IActionRecord = z.infer<typeof ActionRecordSchema>;

export const PhaseSchema = z.object({
  id: z.uuid(),
  position: z.number().int(),
  name: z.string(),
  summary: z.string(),
  explanation: z.string(),
  spectatorText: z.string(),
  actions: z.array(ActionRecordSchema),
  techniques: z.array(TechniqueSchema),
  notes: z.array(NoteSchema),
});
export type IPhase = z.infer<typeof PhaseSchema>;

export const RoutineDetailSchema = z.object({
  id: z.uuid(),
  trickId: z.uuid(),
  name: z.string(),
  description: z.string(),
  tips: z.array(z.string()),
  phases: z.array(PhaseSchema),
});
export type IRoutineDetail = z.infer<typeof RoutineDetailSchema>;
```

`packages/shared/src/schemas/error.ts`:

```ts
import { z } from "zod";

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});
export type IApiError = z.infer<typeof ApiErrorSchema>;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test packages/shared`
Expected: PASS (all action, note, routine tests).

- [ ] **Step 5: Leave changes uncommitted** (D8).

---

### Task 4: Ambitious Card fixture

**Files:**
- Create: `packages/shared/src/fixtures/ambitiousCard.ts`
- Test: `packages/shared/src/fixtures/ambitiousCard.test.ts`

**Interfaces:**
- Consumes: `TAction`, `ActionSchema`, `TCategory`, `TDifficulty`, `TItemKind`.
- Produces:
  - `IFixtureAction { action: TAction; durationMs: number }`
  - `IFixturePhase { name; summary; explanation; spectatorText; techniques: string[]; actions: IFixtureAction[] }`
  - `IFixtureTechnique`, `IFixtureItem`, `ITrickFixture`
  - `AMBITIOUS_CARD: ITrickFixture` — 5 phases, 10 actions total, action counts per phase `[1, 2, 4, 1, 2]`, techniques `Double Lift`, `Card Insertion`, `Snap`, `Spread`; one prop `Deck of cards`; 4 tips; `trickNote`.
  - Consumed by engine tests (Tasks 6–8), API seed (Part 2), web player tests (Part 3).

- [ ] **Step 1: Write the failing test**

`packages/shared/src/fixtures/ambitiousCard.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/shared/src/fixtures`
Expected: FAIL — `Cannot find module './ambitiousCard'`.

- [ ] **Step 3: Write the fixture**

`packages/shared/src/fixtures/ambitiousCard.ts`:

```ts
import type { TAction } from "../schemas/action";
import type { TCategory, TDifficulty, TItemKind } from "../schemas/enums";

export interface IFixtureAction {
  action: TAction;
  durationMs: number;
}

export interface IFixturePhase {
  name: string;
  summary: string;
  explanation: string;
  spectatorText: string;
  techniques: string[];
  actions: IFixtureAction[];
}

export interface IFixtureTechnique {
  name: string;
  description: string;
  difficulty: TDifficulty;
  category: string;
  tips: string[];
  commonMistakes: string[];
}

export interface IFixtureItem {
  kind: TItemKind;
  name: string;
  description: string;
  setupNotes: string;
}

export interface ITrickFixture {
  trick: {
    name: string;
    slug: string;
    description: string;
    category: TCategory;
    difficulty: TDifficulty;
    durationMin: number;
    durationMax: number;
  };
  routine: { name: string; description: string; tips: string[] };
  techniques: IFixtureTechnique[];
  items: IFixtureItem[];
  phases: IFixturePhase[];
  trickNote: string;
}

export const AMBITIOUS_CARD: ITrickFixture = {
  trick: {
    name: "Ambitious Card",
    slug: "ambitious-card",
    description:
      "A single card keeps rising to the top of the deck, no matter how many times it is lost. The impossible happens, again and again.",
    category: "card",
    difficulty: "intermediate",
    durationMin: 5,
    durationMax: 8,
  },
  routine: {
    name: "Standard",
    description: "The classic double-lift version with a single insertion and a fan reveal.",
    tips: [
      "Keep your hands relaxed and natural.",
      "Use misdirection during the snap.",
      "Practice the double lift until it is smooth.",
      "Give the reveal enough space.",
    ],
  },
  techniques: [
    {
      name: "Double Lift",
      description: "Lift two cards as if they were one.",
      difficulty: "intermediate",
      category: "Control",
      tips: ["Get a small break first.", "Square the pair before turning it."],
      commonMistakes: ["Flashing the second card during the turnover."],
    },
    {
      name: "Card Insertion",
      description: "Push a card cleanly into the middle of the deck.",
      difficulty: "beginner",
      category: "Control",
      tips: ["Leave the card jogged so the audience sees it go in."],
      commonMistakes: ["Rushing the insertion."],
    },
    {
      name: "Snap",
      description: "A clear audible beat that marks the magic moment.",
      difficulty: "beginner",
      category: "Beat",
      tips: ["Look at the deck, not at your hand."],
      commonMistakes: ["Snapping before the deck is squared."],
    },
    {
      name: "Spread",
      description: "Fan the deck to display the ending cleanly.",
      difficulty: "beginner",
      category: "Display",
      tips: ["Keep the fan even so the face-up card stands out."],
      commonMistakes: ["Spreading too fast to read."],
    },
  ],
  items: [
    {
      kind: "prop",
      name: "Deck of cards",
      description: "A regular 52-card deck.",
      setupNotes: "No preparation needed before the performance.",
    },
  ],
  phases: [
    {
      name: "Preparation",
      summary: "Set the scene",
      explanation:
        "An indifferent card (7♣) sits on top. The selected card (A♥) is secretly second from the top.",
      spectatorText: "The selected card is placed on top of the deck.",
      techniques: [],
      actions: [
        {
          action: { type: "setupDeck", params: { named: [{ label: "7C" }, { label: "AH" }], restCount: 50 } },
          durationMs: 700,
        },
      ],
    },
    {
      name: "Double Lift",
      summary: "Secret handling",
      explanation:
        "Lift the top two cards as one and turn them face up. The spectator sees A♥, but two cards are held as a single unit.",
      spectatorText: "The selected card is shown on top of the deck.",
      techniques: ["Double Lift"],
      actions: [
        { action: { type: "doubleLift", params: { count: 2 } }, durationMs: 800 },
        { action: { type: "turnOver", params: { target: "lifted" } }, durationMs: 700 },
      ],
    },
    {
      name: "Insert",
      summary: "Apparently lost",
      explanation:
        "Turn the pair face down and square it on the deck. Take only the top card — the 7♣ — and push it into the middle. A♥ stays on top.",
      spectatorText: "The selected card is pushed into the middle of the deck.",
      techniques: ["Double Lift", "Card Insertion"],
      actions: [
        { action: { type: "turnOver", params: { target: "lifted" } }, durationMs: 700 },
        { action: { type: "replace", params: {} }, durationMs: 500 },
        { action: { type: "takeTop", params: { count: 1 } }, durationMs: 600 },
        { action: { type: "insert", params: { depth: "middle" } }, durationMs: 800 },
      ],
    },
    {
      name: "Snap",
      summary: "Magical beat",
      explanation: "Nothing secret happens. Square the deck and snap your fingers to mark the magic moment.",
      spectatorText: "A snap — the magic happens.",
      techniques: ["Snap"],
      actions: [{ action: { type: "snap", params: {} }, durationMs: 600 }],
    },
    {
      name: "Fan Reveal",
      summary: "Final display",
      explanation: "Turn over the top card: it is A♥, which never left. Spread the deck to show the ending cleanly.",
      spectatorText: "The selected card is back on top.",
      techniques: ["Spread"],
      actions: [
        { action: { type: "revealTop", params: {} }, durationMs: 700 },
        { action: { type: "spread", params: {} }, durationMs: 900 },
      ],
    },
  ],
  trickNote: "Need to practice close-up handling and slow down the snap moment.",
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/shared`
Expected: PASS.

- [ ] **Step 5: Typecheck & format the shared package**

Run: `bunx biome check --write packages/shared && bun run --cwd packages/shared typecheck`
Expected: no errors.

- [ ] **Step 6: Leave changes uncommitted** (D8).

---

### Task 5: Engine types, errors & scene reducer

**Files:**
- Create: `packages/engine/src/types.ts`, `packages/engine/src/errors.ts`, `packages/engine/src/scene.ts`
- Test: `packages/engine/src/scene.test.ts`

**Interfaces:**
- Consumes: `TAction` from `@sleightbook/shared/schemas/action`.
- Produces (`types.ts`):
  ```ts
  type TFace = "up" | "down";
  type TView = "spectator" | "secret";
  interface ICard { id: string; label: string; face: TFace; perceivedAs: string | null }
  interface ILifted { cardIds: string[]; asOne: boolean }
  interface ISceneState { cards: Record<string, ICard>; deck: string[]; restCount: number; lifted: ILifted | null;
    hand: string[]; buried: string[]; jogged: string | null; spread: boolean; beat: boolean }
  interface IPhaseInput { actions: ReadonlyArray<{ action: TAction; durationMs: number }> }
  interface IFrame { phaseIndex: number; actionIndex: number; state: ISceneState; durationMs: number }
  interface ITimeline { initial: ISceneState; frames: IFrame[]; phaseEnds: number[] }
  interface IProjectedCard { id: string; label: string; face: TFace; perceivedLabel: string | null }
  interface IProjectedScene { view: TView; deck: IProjectedCard[]; restCount: number;
    lifted: { cards: IProjectedCard[]; asOne: boolean } | null; hand: IProjectedCard[]; buried: IProjectedCard[];
    joggedId: string | null; spread: boolean; beat: boolean }
  type TNodeKind = "card" | "deckBlock" | "fanCard";
  type TNodeZone = "deck" | "lifted" | "hand" | "buried" | "fan" | "block";
  type THighlight = "none" | "perceived" | "jogged";
  interface IRenderNode { id: string; kind: TNodeKind; zone: TNodeZone; x: number; y: number; rotation: number;
    z: number; face: TFace; label: string; perceivedLabel: string | null; highlight: THighlight }
  ```
- Produces (`errors.ts`): `TEngineErrorCode`, `IEngineErrorInfo`, `class EngineError { code; phaseIndex; actionIndex; toInfo() }`.
- Produces (`scene.ts`): `createEmptyScene(): ISceneState`, `applyAction(state, action): ISceneState`. Card ids are `c1…cN` in `setupDeck` order (for the fixture: `c1` = 7C, `c2` = AH).

- [ ] **Step 1: Write types and errors (no behavior to test yet)**

`packages/engine/src/types.ts`:

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

export interface IPhaseInput {
  actions: ReadonlyArray<{ action: TAction; durationMs: number }>;
}

export interface IFrame {
  phaseIndex: number;
  actionIndex: number;
  state: ISceneState;
  durationMs: number;
}

export interface ITimeline {
  initial: ISceneState;
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

export type TNodeKind = "card" | "deckBlock" | "fanCard";
export type TNodeZone = "deck" | "lifted" | "hand" | "buried" | "fan" | "block";
export type THighlight = "none" | "perceived" | "jogged";

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

`packages/engine/src/errors.ts`:

```ts
export type TEngineErrorCode =
  | "NOT_SETUP"
  | "NO_LIFTED"
  | "ALREADY_LIFTED"
  | "DECK_TOO_SMALL"
  | "HAND_EMPTY"
  | "EMPTY_ROUTINE"
  | "EMPTY_PHASE"
  | "UNKNOWN_ACTION";

export interface IEngineErrorInfo {
  code: TEngineErrorCode;
  message: string;
  phaseIndex: number | null;
  actionIndex: number | null;
}

export class EngineError extends Error {
  readonly code: TEngineErrorCode;
  phaseIndex: number | null = null;
  actionIndex: number | null = null;

  constructor(code: TEngineErrorCode, message: string) {
    super(message);
    this.name = "EngineError";
    this.code = code;
  }

  toInfo(): IEngineErrorInfo {
    return {
      code: this.code,
      message: this.message,
      phaseIndex: this.phaseIndex,
      actionIndex: this.actionIndex,
    };
  }
}
```

- [ ] **Step 2: Write the failing reducer test**

`packages/engine/src/scene.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import type { TAction } from "@sleightbook/shared/schemas/action";

import { EngineError, type TEngineErrorCode } from "./errors";
import { applyAction, createEmptyScene } from "./scene";
import type { ISceneState } from "./types";

const SETUP: TAction = {
  type: "setupDeck",
  params: { named: [{ label: "7C" }, { label: "AH" }], restCount: 50 },
};

const run = (...actions: TAction[]): ISceneState =>
  actions.reduce<ISceneState>((state, action) => applyAction(state, action), createEmptyScene());

const errorCodeOf = (fn: () => unknown): TEngineErrorCode | null => {
  try {
    fn();
  } catch (error) {
    if (error instanceof EngineError) return error.code;
    throw error;
  }
  return null;
};

describe("applyAction", () => {
  test("setupDeck creates face-down named cards on top of the deck", () => {
    const state = run(SETUP);
    expect(state.deck).toEqual(["c1", "c2"]);
    expect(state.restCount).toBe(50);
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "down", perceivedAs: null });
    expect(state.cards.c2?.label).toBe("AH");
  });

  test("any action before setupDeck fails with NOT_SETUP", () => {
    expect(errorCodeOf(() => applyAction(createEmptyScene(), { type: "snap", params: {} }))).toBe(
      "NOT_SETUP",
    );
  });

  test("doubleLift moves the top cards into a single lifted unit", () => {
    const state = run(SETUP, { type: "doubleLift", params: { count: 2 } });
    expect(state.deck).toEqual([]);
    expect(state.lifted).toEqual({ cardIds: ["c1", "c2"], asOne: true });
  });

  test("doubleLift validates deck size and existing lift", () => {
    expect(errorCodeOf(() => run(SETUP, { type: "doubleLift", params: { count: 3 } }))).toBe(
      "DECK_TOO_SMALL",
    );
    expect(
      errorCodeOf(() =>
        run(SETUP, { type: "doubleLift", params: { count: 2 } }, { type: "doubleLift", params: { count: 2 } }),
      ),
    ).toBe("ALREADY_LIFTED");
  });

  test("turnOver on a lifted unit reverses it, flips faces and sets perceivedAs", () => {
    const state = run(
      SETUP,
      { type: "doubleLift", params: { count: 2 } },
      { type: "turnOver", params: { target: "lifted" } },
    );
    expect(state.lifted?.cardIds).toEqual(["c2", "c1"]);
    expect(state.cards.c2).toEqual({ id: "c2", label: "AH", face: "up", perceivedAs: "AH" });
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "up", perceivedAs: "AH" });
  });

  test("turning the unit back face down keeps perceivedAs", () => {
    const state = run(
      SETUP,
      { type: "doubleLift", params: { count: 2 } },
      { type: "turnOver", params: { target: "lifted" } },
      { type: "turnOver", params: { target: "lifted" } },
    );
    expect(state.lifted?.cardIds).toEqual(["c1", "c2"]);
    expect(state.cards.c1?.face).toBe("down");
    expect(state.cards.c1?.perceivedAs).toBe("AH");
  });

  test("turnOver lifted without a lift fails with NO_LIFTED", () => {
    expect(errorCodeOf(() => run(SETUP, { type: "turnOver", params: { target: "lifted" } }))).toBe(
      "NO_LIFTED",
    );
  });

  test("turnOver top flips the top deck card and clears perceivedAs when face up", () => {
    const state = run(SETUP, { type: "turnOver", params: { target: "top" } });
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "up", perceivedAs: null });
  });

  test("replace puts the lifted unit back on top", () => {
    const state = run(SETUP, { type: "doubleLift", params: { count: 2 } }, { type: "replace", params: {} });
    expect(state.deck).toEqual(["c1", "c2"]);
    expect(state.lifted).toBeNull();
    expect(errorCodeOf(() => run(SETUP, { type: "replace", params: {} }))).toBe("NO_LIFTED");
  });

  test("takeTop and insert bury the top card and jog it", () => {
    const taken = run(SETUP, { type: "takeTop", params: { count: 1 } });
    expect(taken.hand).toEqual(["c1"]);
    expect(taken.deck).toEqual(["c2"]);

    const inserted = applyAction(taken, { type: "insert", params: { depth: "middle" } });
    expect(inserted.hand).toEqual([]);
    expect(inserted.buried).toEqual(["c1"]);
    expect(inserted.jogged).toBe("c1");
    expect(errorCodeOf(() => run(SETUP, { type: "insert", params: { depth: "middle" } }))).toBe(
      "HAND_EMPTY",
    );
  });

  test("snap clears the jog and sets beat only for one frame", () => {
    const snapped = run(
      SETUP,
      { type: "takeTop", params: { count: 1 } },
      { type: "insert", params: { depth: "middle" } },
      { type: "snap", params: {} },
    );
    expect(snapped.jogged).toBeNull();
    expect(snapped.beat).toBe(true);
    expect(applyAction(snapped, { type: "square", params: {} }).beat).toBe(false);
  });

  test("revealTop turns the top card face up and clears perceivedAs", () => {
    const state = run(SETUP, { type: "revealTop", params: {} });
    expect(state.cards.c1).toEqual({ id: "c1", label: "7C", face: "up", perceivedAs: null });
  });

  test("spread and square toggle the fan", () => {
    const spread = run(SETUP, { type: "spread", params: {} });
    expect(spread.spread).toBe(true);
    expect(applyAction(spread, { type: "square", params: {} }).spread).toBe(false);
  });

  test("applyAction never mutates its input", () => {
    const before = run(SETUP, { type: "doubleLift", params: { count: 2 } });
    const snapshot = structuredClone(before);
    applyAction(before, { type: "turnOver", params: { target: "lifted" } });
    expect(before).toEqual(snapshot);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test packages/engine/src/scene.test.ts`
Expected: FAIL — `Cannot find module './scene'`.

- [ ] **Step 4: Write the reducer**

`packages/engine/src/scene.ts`:

```ts
import type { TAction } from "@sleightbook/shared/schemas/action";

import { EngineError } from "./errors";
import type { ICard, ISceneState, TFace } from "./types";

type TSetupParams = Extract<TAction, { type: "setupDeck" }>["params"];

export const createEmptyScene = (): ISceneState => ({
  cards: {},
  deck: [],
  restCount: 0,
  lifted: null,
  hand: [],
  buried: [],
  jogged: null,
  spread: false,
  beat: false,
});

const flipFace = (face: TFace): TFace => (face === "up" ? "down" : "up");

const requireDeck = (state: ISceneState, count: number): void => {
  if (state.deck.length < count) {
    throw new EngineError(
      "DECK_TOO_SMALL",
      `Needs ${count} named card(s) on top of the deck, found ${state.deck.length}`,
    );
  }
};

const setupDeck = (params: TSetupParams): ISceneState => {
  const cards: Record<string, ICard> = {};
  const deck = params.named.map((named, index) => {
    const id = `c${index + 1}`;
    cards[id] = { id, label: named.label, face: "down", perceivedAs: null };
    return id;
  });
  return { ...createEmptyScene(), cards, deck, restCount: params.restCount };
};

export const applyAction = (state: ISceneState, action: TAction): ISceneState => {
  if (action.type === "setupDeck") return setupDeck(action.params);
  if (Object.keys(state.cards).length === 0) {
    throw new EngineError("NOT_SETUP", `"${action.type}" requires setupDeck first`);
  }

  const next: ISceneState = { ...state, beat: false };

  switch (action.type) {
    case "doubleLift": {
      if (state.lifted) throw new EngineError("ALREADY_LIFTED", "Cards are already lifted");
      requireDeck(state, action.params.count);
      return {
        ...next,
        deck: state.deck.slice(action.params.count),
        lifted: { cardIds: state.deck.slice(0, action.params.count), asOne: true },
      };
    }
    case "turnOver": {
      if (action.params.target === "top") {
        requireDeck(state, 1);
        const topId = state.deck[0];
        const card = state.cards[topId];
        const face = flipFace(card.face);
        return {
          ...next,
          cards: {
            ...state.cards,
            [topId]: { ...card, face, perceivedAs: face === "up" ? null : card.perceivedAs },
          },
        };
      }
      if (!state.lifted) throw new EngineError("NO_LIFTED", "No lifted cards to turn over");
      const cardIds = [...state.lifted.cardIds].reverse();
      const cards = { ...state.cards };
      for (const id of cardIds) {
        cards[id] = { ...cards[id], face: flipFace(cards[id].face) };
      }
      const visible = cards[cardIds[0]];
      if (state.lifted.asOne && visible.face === "up") {
        for (const id of cardIds) {
          cards[id] = { ...cards[id], perceivedAs: visible.label };
        }
      }
      return { ...next, cards, lifted: { ...state.lifted, cardIds } };
    }
    case "replace": {
      if (!state.lifted) throw new EngineError("NO_LIFTED", "No lifted cards to replace");
      return { ...next, deck: [...state.lifted.cardIds, ...state.deck], lifted: null };
    }
    case "takeTop": {
      requireDeck(state, action.params.count);
      return {
        ...next,
        deck: state.deck.slice(action.params.count),
        hand: [...state.hand, ...state.deck.slice(0, action.params.count)],
      };
    }
    case "insert": {
      const cardId = state.hand[state.hand.length - 1];
      if (cardId === undefined) throw new EngineError("HAND_EMPTY", "No card in hand to insert");
      return {
        ...next,
        hand: state.hand.slice(0, -1),
        buried: [...state.buried, cardId],
        jogged: cardId,
      };
    }
    case "square":
      return { ...next, jogged: null, spread: false };
    case "snap":
      return { ...next, jogged: null, beat: true };
    case "revealTop": {
      requireDeck(state, 1);
      const topId = state.deck[0];
      return {
        ...next,
        cards: { ...state.cards, [topId]: { ...state.cards[topId], face: "up", perceivedAs: null } },
      };
    }
    case "spread":
      return { ...next, spread: true };
    default: {
      const unknownAction: never = action;
      throw new EngineError("UNKNOWN_ACTION", `Unknown action: ${JSON.stringify(unknownAction)}`);
    }
  }
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test packages/engine/src/scene.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 6: Leave changes uncommitted** (D8).

---

### Task 6: Timeline, validation & stateAt

**Files:**
- Create: `packages/engine/src/timeline.ts`
- Test: `packages/engine/src/timeline.test.ts`

**Interfaces:**
- Consumes: `applyAction`, `createEmptyScene` (Task 5), `EngineError`, `IEngineErrorInfo`, `IPhaseInput`, `ITimeline`, `ISceneState`.
- Produces:
  - `buildTimeline(phases: readonly IPhaseInput[]): ITimeline` — throws `EngineError` with `phaseIndex`/`actionIndex` set; `EMPTY_ROUTINE` for `[]`, `EMPTY_PHASE` for a phase with no actions.
  - `validateRoutine(phases): TRoutineValidation` where `type TRoutineValidation = { ok: true } | { ok: false; error: IEngineErrorInfo }`
  - `stateAt(timeline, frameIndex): ISceneState` — `frameIndex < 0` → `timeline.initial`; clamps past the end.
  - For `AMBITIOUS_CARD.phases`: 10 frames, `phaseEnds = [0, 2, 6, 7, 9]`.

- [ ] **Step 1: Write the failing test**

`packages/engine/src/timeline.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { EngineError } from "./errors";
import { buildTimeline, stateAt, validateRoutine } from "./timeline";

describe("buildTimeline", () => {
  const timeline = buildTimeline(AMBITIOUS_CARD.phases);

  test("produces one frame per action and records phase ends", () => {
    expect(timeline.frames).toHaveLength(10);
    expect(timeline.phaseEnds).toEqual([0, 2, 6, 7, 9]);
    expect(timeline.frames[3]).toMatchObject({ phaseIndex: 2, actionIndex: 0, durationMs: 700 });
  });

  test("end of Double Lift: two cards lifted face up, perceived as A♥", () => {
    const state = timeline.frames[2]?.state;
    expect(state?.lifted?.cardIds).toEqual(["c2", "c1"]);
    expect(state?.cards.c1?.perceivedAs).toBe("AH");
  });

  test("end of Insert: 7♣ buried and jogged, A♥ on top", () => {
    const state = timeline.frames[6]?.state;
    expect(state?.deck).toEqual(["c2"]);
    expect(state?.buried).toEqual(["c1"]);
    expect(state?.jogged).toBe("c1");
  });

  test("end of Fan Reveal: A♥ face up on top and deck spread", () => {
    const state = timeline.frames[9]?.state;
    expect(state?.deck[0]).toBe("c2");
    expect(state?.cards.c2?.face).toBe("up");
    expect(state?.spread).toBe(true);
  });

  test("errors carry phase and action indexes", () => {
    try {
      buildTimeline([
        AMBITIOUS_CARD.phases[0] ?? { actions: [] },
        { actions: [{ action: { type: "replace", params: {} }, durationMs: 500 }] },
      ]);
      throw new Error("expected EngineError");
    } catch (error) {
      expect(error).toBeInstanceOf(EngineError);
      expect((error as EngineError).toInfo()).toMatchObject({
        code: "NO_LIFTED",
        phaseIndex: 1,
        actionIndex: 0,
      });
    }
  });
});

describe("validateRoutine", () => {
  test("accepts the Ambitious Card routine", () => {
    expect(validateRoutine(AMBITIOUS_CARD.phases)).toEqual({ ok: true });
  });

  test("rejects an empty routine and an empty phase", () => {
    expect(validateRoutine([])).toMatchObject({ ok: false, error: { code: "EMPTY_ROUTINE" } });
    expect(validateRoutine([{ actions: [] }])).toMatchObject({
      ok: false,
      error: { code: "EMPTY_PHASE", phaseIndex: 0 },
    });
  });

  test("rejects an action before setup", () => {
    expect(
      validateRoutine([{ actions: [{ action: { type: "snap", params: {} }, durationMs: 600 }] }]),
    ).toMatchObject({ ok: false, error: { code: "NOT_SETUP", phaseIndex: 0, actionIndex: 0 } });
  });
});

describe("stateAt", () => {
  const timeline = buildTimeline(AMBITIOUS_CARD.phases);

  test("returns the initial empty scene for negative indexes", () => {
    expect(stateAt(timeline, -1)).toBe(timeline.initial);
    expect(stateAt(timeline, -1).deck).toEqual([]);
  });

  test("returns frame states and clamps past the end", () => {
    expect(stateAt(timeline, 2)).toBe(timeline.frames[2]?.state);
    expect(stateAt(timeline, 99)).toBe(timeline.frames[9]?.state);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/engine/src/timeline.test.ts`
Expected: FAIL — `Cannot find module './timeline'`.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/timeline.ts`:

```ts
import { EngineError, type IEngineErrorInfo } from "./errors";
import { applyAction, createEmptyScene } from "./scene";
import type { IFrame, IPhaseInput, ISceneState, ITimeline } from "./types";

export type TRoutineValidation = { ok: true } | { ok: false; error: IEngineErrorInfo };

export const buildTimeline = (phases: readonly IPhaseInput[]): ITimeline => {
  if (phases.length === 0) throw new EngineError("EMPTY_ROUTINE", "A routine needs at least one phase");

  const initial = createEmptyScene();
  const frames: IFrame[] = [];
  const phaseEnds: number[] = [];
  let state = initial;

  phases.forEach((phase, phaseIndex) => {
    if (phase.actions.length === 0) {
      const error = new EngineError("EMPTY_PHASE", `Phase ${phaseIndex + 1} has no actions`);
      error.phaseIndex = phaseIndex;
      throw error;
    }
    phase.actions.forEach((record, actionIndex) => {
      try {
        state = applyAction(state, record.action);
      } catch (error) {
        if (error instanceof EngineError) {
          error.phaseIndex = phaseIndex;
          error.actionIndex = actionIndex;
        }
        throw error;
      }
      frames.push({ phaseIndex, actionIndex, state, durationMs: record.durationMs });
    });
    phaseEnds.push(frames.length - 1);
  });

  return { initial, frames, phaseEnds };
};

export const validateRoutine = (phases: readonly IPhaseInput[]): TRoutineValidation => {
  try {
    buildTimeline(phases);
    return { ok: true };
  } catch (error) {
    if (error instanceof EngineError) return { ok: false, error: error.toInfo() };
    throw error;
  }
};

export const stateAt = (timeline: ITimeline, frameIndex: number): ISceneState => {
  if (frameIndex < 0 || timeline.frames.length === 0) return timeline.initial;
  const clamped = Math.min(frameIndex, timeline.frames.length - 1);
  return timeline.frames[clamped].state;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/engine`
Expected: PASS (scene + timeline).

- [ ] **Step 5: Leave changes uncommitted** (D8).

---

### Task 7: Spectator / Secret projection

**Files:**
- Create: `packages/engine/src/project.ts`
- Test: `packages/engine/src/project.test.ts`

**Interfaces:**
- Consumes: `ISceneState`, `ICard`, `TView`, `IProjectedScene`, `IProjectedCard`; `buildTimeline` (tests only).
- Produces: `project(state: ISceneState, view: TView): IProjectedScene`.
  - `secret`: every real card; `perceivedLabel` = `perceivedAs` when it differs from `label`, else `null`.
  - `spectator`: `label` = `perceivedAs ?? label`, `perceivedLabel` always `null`; a lifted unit with `asOne` shows only its top card.

- [ ] **Step 1: Write the failing test**

`packages/engine/src/project.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { AMBITIOUS_CARD } from "@sleightbook/shared/fixtures/ambitiousCard";

import { project } from "./project";
import { buildTimeline, stateAt } from "./timeline";

const timeline = buildTimeline(AMBITIOUS_CARD.phases);
const END_OF_DOUBLE_LIFT = 2;
const END_OF_INSERT = 6;

describe("project", () => {
  test("secret view shows both lifted cards and marks the impostor", () => {
    const scene = project(stateAt(timeline, END_OF_DOUBLE_LIFT), "secret");
    expect(scene.lifted?.cards).toEqual([
      { id: "c2", label: "AH", face: "up", perceivedLabel: null },
      { id: "c1", label: "7C", face: "up", perceivedLabel: "AH" },
    ]);
  });

  test("spectator view collapses the double lift into one card", () => {
    const scene = project(stateAt(timeline, END_OF_DOUBLE_LIFT), "spectator");
    expect(scene.lifted?.cards).toEqual([{ id: "c2", label: "AH", face: "up", perceivedLabel: null }]);
  });

  test("secret view reveals the buried card is really 7♣", () => {
    const scene = project(stateAt(timeline, END_OF_INSERT), "secret");
    expect(scene.buried).toEqual([{ id: "c1", label: "7C", face: "down", perceivedLabel: "AH" }]);
    expect(scene.joggedId).toBe("c1");
  });

  test("spectator view believes the buried card is A♥", () => {
    const scene = project(stateAt(timeline, END_OF_INSERT), "spectator");
    expect(scene.buried).toEqual([{ id: "c1", label: "AH", face: "down", perceivedLabel: null }]);
  });

  test("copies scalar scene fields", () => {
    const scene = project(stateAt(timeline, 7), "spectator");
    expect(scene).toMatchObject({ view: "spectator", restCount: 50, beat: true, spread: false });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/engine/src/project.test.ts`
Expected: FAIL — `Cannot find module './project'`.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/project.ts`:

```ts
import type { ICard, IProjectedCard, IProjectedScene, ISceneState, TView } from "./types";

const toProjectedCard = (card: ICard, view: TView): IProjectedCard => {
  const perceived = card.perceivedAs !== null && card.perceivedAs !== card.label ? card.perceivedAs : null;
  if (view === "spectator") {
    return { id: card.id, label: perceived ?? card.label, face: card.face, perceivedLabel: null };
  }
  return { id: card.id, label: card.label, face: card.face, perceivedLabel: perceived };
};

export const project = (state: ISceneState, view: TView): IProjectedScene => {
  const toCards = (ids: readonly string[]): IProjectedCard[] =>
    ids.map((id) => toProjectedCard(state.cards[id], view));

  let lifted: IProjectedScene["lifted"] = null;
  if (state.lifted) {
    const cards = toCards(state.lifted.cardIds);
    const isCollapsed = view === "spectator" && state.lifted.asOne;
    lifted = { asOne: state.lifted.asOne, cards: isCollapsed ? cards.slice(0, 1) : cards };
  }

  return {
    view,
    deck: toCards(state.deck),
    restCount: state.restCount,
    lifted,
    hand: toCards(state.hand),
    buried: toCards(state.buried),
    joggedId: state.jogged,
    spread: state.spread,
    beat: state.beat,
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/engine`
Expected: PASS.

- [ ] **Step 5: Leave changes uncommitted** (D8).

---

### Task 8: Layout

**Files:**
- Create: `packages/engine/src/layout.ts`
- Test: `packages/engine/src/layout.test.ts`

**Interfaces:**
- Consumes: `IProjectedScene`, `IProjectedCard`, `IRenderNode`, `THighlight`; `project`, `buildTimeline`, `stateAt` (tests only).
- Produces:
  - Constants `STAGE_WIDTH = 360`, `STAGE_HEIGHT = 300`, `CARD_WIDTH = 72`, `CARD_HEIGHT = 100`, `DECK_X = 144`, `DECK_Y = 110`, `FAN_SIZE = 9`
  - `layout(scene: IProjectedScene): IRenderNode[]` sorted by ascending `z`. Coordinates are the card's top-left in the 360×300 stage; rotation is degrees around the card center.
  - Deck block node id `"deck-block"`; fan card ids `"fan-0"…"fan-8"`; card nodes use card ids.

Placement rules (locked by the tests below):

| Zone | x | y | rotation | z |
|---|---|---|---|---|
| block (not spread) | 144 | 110 | 0 | 1 |
| buried card | 144 (+30 if jogged) | 112 | 0 | 0 |
| deck card i of n (0 = top) | 144 | 110 − 2·(n − i) | 0 | 10 + (n − i) |
| lifted card j of k (0 = top) | 164 + 6j | 50 + 6j | 6 | 30 + (k − j) |
| hand card j | 272 − 6j | 120 | −8 | 40 + j |
| fan position p of T (spread) | 30 + p·228/(T−1) | 120 + 3·abs(p − (T−1)/2) | −20 + p·40/(T−1) | 1 + p |

When `spread`: no block, no buried cards; 9 anonymous `fanCard`s occupy positions 0–8, then named deck cards follow with the top card last (highest `p`). Numbers are rounded to 2 decimals. Highlight: `perceived` if `perceivedLabel` is set, else `jogged` if the card is the jogged one, else `none`.

- [ ] **Step 1: Write the failing test**

`packages/engine/src/layout.test.ts`:

```ts
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
    expect(byId(nodes, "deck-block")).toMatchObject({ kind: "deckBlock", zone: "block", x: 144, y: 110, z: 1 });
    expect(byId(nodes, "c1")).toMatchObject({ zone: "deck", x: 144, y: 106, z: 12, face: "down" });
    expect(byId(nodes, "c2")).toMatchObject({ zone: "deck", x: 144, y: 108, z: 11 });
  });

  test("double lift (secret): both lifted cards visible with an offset", () => {
    const nodes = nodesAt(2, "secret");
    expect(byId(nodes, "c2")).toMatchObject({ zone: "lifted", x: 164, y: 50, rotation: 6, z: 32, face: "up" });
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
    expect(byId(nodesAt(5, "secret"), "c1")).toMatchObject({ zone: "hand", x: 272, y: 120, rotation: -8, z: 40 });
  });

  test("fan reveal: nine fan cards then A♥ face up at the end", () => {
    const nodes = nodesAt(9, "secret");
    expect(byId(nodes, "deck-block")).toBeUndefined();
    expect(nodes.filter((node) => node.kind === "fanCard")).toHaveLength(9);
    expect(byId(nodes, "fan-0")).toMatchObject({ zone: "fan", x: 30, y: 133.5, rotation: -20, z: 1 });
    expect(byId(nodes, "c2")).toMatchObject({ zone: "fan", x: 258, y: 133.5, rotation: 20, z: 10, face: "up" });
    expect(nodes.at(-1)?.id).toBe("c2");
  });

  test("nodes are sorted by z", () => {
    const zs = nodesAt(6, "secret").map((node) => node.z);
    expect(zs).toEqual([...zs].sort((a, b) => a - b));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test packages/engine/src/layout.test.ts`
Expected: FAIL — `Cannot find module './layout'`.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/layout.ts`:

```ts
import type { IProjectedCard, IProjectedScene, IRenderNode, THighlight, TNodeZone } from "./types";

export const STAGE_WIDTH = 360;
export const STAGE_HEIGHT = 300;
export const CARD_WIDTH = 72;
export const CARD_HEIGHT = 100;
export const DECK_X = 144;
export const DECK_Y = 110;
export const FAN_SIZE = 9;

const JOG_OFFSET = 30;
const LIFT_X = 164;
const LIFT_Y = 50;
const LIFT_STEP = 6;
const HAND_X = 272;
const HAND_Y = 120;
const FAN_LEFT = 30;
const FAN_WIDTH = 228;
const FAN_Y = 120;
const FAN_ARC = 40;

const round2 = (value: number): number => Math.round(value * 100) / 100;

const highlightOf = (card: IProjectedCard, joggedId: string | null): THighlight => {
  if (card.perceivedLabel !== null) return "perceived";
  if (card.id === joggedId) return "jogged";
  return "none";
};

const cardNode = (
  card: IProjectedCard,
  zone: TNodeZone,
  position: { x: number; y: number; rotation: number; z: number },
  joggedId: string | null,
): IRenderNode => ({
  id: card.id,
  kind: "card",
  zone,
  x: round2(position.x),
  y: round2(position.y),
  rotation: round2(position.rotation),
  z: position.z,
  face: card.face,
  label: card.label,
  perceivedLabel: card.perceivedLabel,
  highlight: highlightOf(card, joggedId),
});

const fanPosition = (p: number, total: number) => {
  const last = total - 1;
  return {
    x: FAN_LEFT + (p * FAN_WIDTH) / last,
    y: FAN_Y + 3 * Math.abs(p - last / 2),
    rotation: -FAN_ARC / 2 + (p * FAN_ARC) / last,
    z: 1 + p,
  };
};

export const layout = (scene: IProjectedScene): IRenderNode[] => {
  const nodes: IRenderNode[] = [];
  const { joggedId } = scene;

  if (scene.spread) {
    const total = FAN_SIZE + scene.deck.length;
    for (let p = 0; p < FAN_SIZE; p += 1) {
      const position = fanPosition(p, total);
      nodes.push({
        id: `fan-${p}`,
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
    }
    scene.deck.forEach((card, index) => {
      const p = FAN_SIZE + (scene.deck.length - 1 - index);
      nodes.push(cardNode(card, "fan", fanPosition(p, total), joggedId));
    });
  } else {
    nodes.push({
      id: "deck-block",
      kind: "deckBlock",
      zone: "block",
      x: DECK_X,
      y: DECK_Y,
      rotation: 0,
      z: 1,
      face: "down",
      label: "",
      perceivedLabel: null,
      highlight: "none",
    });
    for (const card of scene.buried) {
      const x = DECK_X + (card.id === joggedId ? JOG_OFFSET : 0);
      nodes.push(cardNode(card, "buried", { x, y: DECK_Y + 2, rotation: 0, z: 0 }, joggedId));
    }
    const count = scene.deck.length;
    scene.deck.forEach((card, index) => {
      const lift = count - index;
      nodes.push(cardNode(card, "deck", { x: DECK_X, y: DECK_Y - 2 * lift, rotation: 0, z: 10 + lift }, joggedId));
    });
  }

  if (scene.lifted) {
    const count = scene.lifted.cards.length;
    scene.lifted.cards.forEach((card, index) => {
      nodes.push(
        cardNode(
          card,
          "lifted",
          { x: LIFT_X + LIFT_STEP * index, y: LIFT_Y + LIFT_STEP * index, rotation: 6, z: 30 + (count - index) },
          joggedId,
        ),
      );
    });
  }

  scene.hand.forEach((card, index) => {
    nodes.push(
      cardNode(card, "hand", { x: HAND_X - LIFT_STEP * index, y: HAND_Y, rotation: -8, z: 40 + index }, joggedId),
    );
  });

  return nodes.sort((a, b) => a.z - b.z);
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test packages/engine`
Expected: PASS (scene, timeline, project, layout).

- [ ] **Step 5: Full Part 1 verification**

Run:

```bash
bunx biome check --write packages
bun run lint
bun run --cwd packages/shared typecheck
bun run --cwd packages/engine typecheck
bun test packages
```

Expected: all exit 0; all tests pass.

- [ ] **Step 6: Leave changes uncommitted** (D8). Part 1 complete → continue with [Part 2](2026-09-26-mvp1-part2-api.md).
