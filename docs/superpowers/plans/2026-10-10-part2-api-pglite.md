# Sleightbook Part 2 (revised) — API on PGlite, MVP1 + Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/api`, a standalone Hono API over a Postgres schema (PGlite, no Docker) that serves everything the web app's local data layer serves today: tricks, library search, routines, techniques, items, favorites and notes.

**Architecture:** The pure library logic that the web app already runs in the browser (record schemas, DTO assembly, search, snapshot building) moves into `@sleightbook/shared/library/*` so the API and the web share one implementation. The API stores the library in normalized Drizzle tables; every read loads the current user's library into an `ILibrarySnapshot` (a handful of scoped queries) and assembles DTOs with the shared functions, so API responses are identical to local-mode responses by construction. Writes (favorite, notes) are direct SQL.

**Tech Stack:** Bun 1.3, Hono 4.13, @hono/zod-validator 0.9, Drizzle ORM 0.45 + drizzle-kit 0.31, @electric-sql/pglite 0.5 (Postgres compiled to WASM, in-process), Zod 4.

**Spec:** [`docs/superpowers/specs/2026-09-26-sleightbook-mvp1-design.md`](../specs/2026-09-26-sleightbook-mvp1-design.md) (§3, §5, §7) and [`docs/superpowers/specs/2026-09-26-sleightbook-phase2-library-design.md`](../specs/2026-09-26-sleightbook-phase2-library-design.md). Supersedes [`2026-09-26-mvp1-part2-api.md`](2026-09-26-mvp1-part2-api.md); its table design is reused unchanged.

## Global Constraints

- Decisions from the user (2026-10-10): **PGlite instead of Docker Postgres**; **scope = MVP1 + Phase 2**; **the web app stays on localStorage** (no web ↔ API wiring in this plan; the GitHub Pages demo must keep working).
- **Commits:** one commit per task, pushed immediately after (`git push origin main`). Conventional Commits with a mandatory scope. No AI attribution of any kind. Before each push run `git log -1 --format="%an <%ae> | %cn <%ce>%n%B"` and stop if anything other than the user's identity shows up. (Overrides the old plan's "no commits" rule.)
- Every query is scoped to `getCurrentUserId()`; `DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000001"`.
- Error body shape: `{ error: { code: string, message: string } }`; codes: `VALIDATION` (400), `NOT_SUPPORTED` (400), `NOT_FOUND` (404), `INTERNAL` (500, generic message).
- API behavior must match the web local data layer (`apps/web/src/api/localDb.ts`), including: notes with a `routineId` are rejected with `400 NOT_SUPPORTED` (no DTO displays routine notes); note bodies are trimmed; lists are sorted by name.
- Drizzle `casing: "snake_case"` in both runtime and drizzle-kit config.
- No fallback values for configuration: `src/env.ts` exposes only `requireEnv`. `apps/api/.env.example` documents `DATA_DIR`, `PORT`, `WEB_ORIGIN`.
- Biome is the only linter/formatter (`lineWidth` 100). Run `bunx biome check --write <paths>` before each commit.
- Tests use in-memory PGlite (`createDb()` with no data dir): no external services, so `bun run check` and CI need nothing new.
- PGlite holds an exclusive lock on its data dir: never run `db:seed` while `dev` is running.

## Review Focus

1. `GET /api/library?favoritesOnly=maybe` — a person expects a 400, not a silently unfiltered list; `favoritesOnly=true` must filter. → Task 4 test "library rejects a non-boolean favoritesOnly".
2. A note created through the API must make its trick findable by search, exactly like local mode. → Task 5 test "search finds text from a note created through the API".
3. Note bodies with surrounding whitespace are stored trimmed; whitespace-only bodies are a 400. → Task 5 test "trims the body and rejects blank bodies".
4. Deleting the same note twice: the second call is a 404, not a 204 or 500. → Task 5 test "deleting twice returns 404 the second time".
5. Data survives an API restart (file-backed PGlite): favorites set before closing the database are there after reopening it. → Task 3 test "a file-backed database keeps data across reopen".

---

### Task 1: Move the library logic into `@sleightbook/shared`

**Files:**
- Create: `packages/shared/src/library/records.ts`
- Move (`git mv`): `apps/web/src/api/assemble.ts` → `packages/shared/src/library/assemble.ts`
- Move (`git mv`): `apps/web/src/api/search.ts` → `packages/shared/src/library/search.ts`
- Move (`git mv`): `apps/web/src/api/seedData.ts` → `packages/shared/src/library/buildSnapshot.ts`
- Modify: `apps/web/src/api/localSchemas.ts`, `apps/web/src/types/localDb.types.ts`, `apps/web/src/api/localDb.ts`, `apps/web/src/api/migrateV1.ts`
- Test: `packages/shared/src/library/buildSnapshot.test.ts`

**Interfaces:**
- Produces (all under `@sleightbook/shared/library/*`):
  - `records`: `PhaseRecordSchema`, `RoutineRecordSchema`, `TrickRecordSchema`, `LibrarySnapshotSchema`; types `IPhaseRecord`, `IRoutineRecord`, `ITrickRecord`, `ILibrarySnapshot` (`{ tricks, routines, techniques, items, notes }`).
  - `assemble`: `isVisualRoutineRecord`, `routinesOfTrick`, `defaultRoutineOf`, `toTrickSummary`, `toTrickCard`, `toTrickDetail`, `toRoutineDetail`, `techniqueUsages`, `itemUsages`, `toTechniqueSummary`, `toTechniqueDetail`, `toItemSummary`, `toItemDetail` — same signatures as today with `ILocalDatabaseV2` replaced by `ILibrarySnapshot`.
  - `search`: `tokenize(query)`, `matchesQuery(snapshot, trick, query: IResolvedLibraryQuery)`.
  - `buildSnapshot`: `buildLibrarySnapshot(fixture: ILibraryFixture, newId: () => string, now: string): ILibrarySnapshot`.
- Web keeps `ILocalDatabaseV2 = ILibrarySnapshot & { version: 2 }` (structurally assignable to `ILibrarySnapshot`).

- [ ] **Step 1: Write the failing test**

`packages/shared/src/library/buildSnapshot.test.ts`:

```ts
import { describe, expect, test } from "bun:test";

import { LIBRARY_FIXTURE } from "../fixtures/library";
import { defaultRoutineOf, isVisualRoutineRecord } from "./assemble";
import { buildLibrarySnapshot } from "./buildSnapshot";
import { LibrarySnapshotSchema } from "./records";

const NOW = "2026-09-26T00:00:00.000Z";

const makeIdFactory = () => {
  let counter = 0;
  return () => {
    counter += 1;
    return `00000000-0000-4000-8000-${counter.toString(16).padStart(12, "0")}`;
  };
};

describe("buildLibrarySnapshot", () => {
  const snapshot = buildLibrarySnapshot(LIBRARY_FIXTURE, makeIdFactory(), NOW);
  const phases = snapshot.routines.flatMap((routine) => routine.phases);

  test("builds a valid snapshot of the whole library", () => {
    expect(LibrarySnapshotSchema.safeParse(snapshot).success).toBe(true);
    expect({
      tricks: snapshot.tricks.length,
      routines: snapshot.routines.length,
      phases: phases.length,
      actions: phases.flatMap((phase) => phase.actions).length,
      techniques: snapshot.techniques.length,
      items: snapshot.items.length,
      notes: snapshot.notes.length,
    }).toEqual({
      tricks: 6,
      routines: 8,
      phases: 29,
      actions: 17,
      techniques: 12,
      items: 6,
      notes: 1,
    });
  });

  test("only Standard and Vernon are visual routines", () => {
    expect(snapshot.routines.filter(isVisualRoutineRecord).map((routine) => routine.name)).toEqual(
      ["Standard", "Vernon"],
    );
  });

  test("every trick resolves its default routine", () => {
    for (const trick of snapshot.tricks) {
      expect(defaultRoutineOf(snapshot, trick.id)?.isDefault).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --cwd packages/shared test src/library`
Expected: FAIL — `Cannot find module './assemble'` (the library modules do not exist yet).

- [ ] **Step 3: Create the records module**

`packages/shared/src/library/records.ts`:

```ts
import { z } from "zod";

import { NoteSchema } from "../schemas/note";
import { ActionRecordSchema, TechniqueSchema } from "../schemas/routine";
import { ItemSchema, TrickSummarySchema } from "../schemas/trick";

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
export type IPhaseRecord = z.infer<typeof PhaseRecordSchema>;

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
export type IRoutineRecord = z.infer<typeof RoutineRecordSchema>;

export const TrickRecordSchema = TrickSummarySchema.extend({
  description: z.string(),
  durationMin: z.number().int(),
  durationMax: z.number().int(),
});
export type ITrickRecord = z.infer<typeof TrickRecordSchema>;

export const LibrarySnapshotSchema = z.object({
  tricks: z.array(TrickRecordSchema),
  routines: z.array(RoutineRecordSchema),
  techniques: z.array(TechniqueSchema),
  items: z.array(ItemSchema),
  notes: z.array(NoteSchema),
});
export type ILibrarySnapshot = z.infer<typeof LibrarySnapshotSchema>;
```

- [ ] **Step 4: Move assemble, search and the seed builder**

```bash
mkdir -p packages/shared/src/library
git mv apps/web/src/api/assemble.ts packages/shared/src/library/assemble.ts
git mv apps/web/src/api/search.ts packages/shared/src/library/search.ts
git mv apps/web/src/api/seedData.ts packages/shared/src/library/buildSnapshot.ts
```

In `packages/shared/src/library/assemble.ts`:
- Replace every `@sleightbook/shared/schemas/<x>` import with `../schemas/<x>`.
- Replace `import type { ILocalDatabaseV2, IRoutineRecord, ITrickRecord } from "../types/localDb.types";` with `import type { ILibrarySnapshot, IRoutineRecord, ITrickRecord } from "./records";`.
- Replace every `ILocalDatabaseV2` with `ILibrarySnapshot` (parameter types only; no logic changes).

In `packages/shared/src/library/search.ts`:
- `@sleightbook/shared/schemas/enums` → `../schemas/enums`; `@sleightbook/shared/schemas/trick` → `../schemas/trick`.
- `import type { ILocalDatabaseV2, ITrickRecord } from "../types/localDb.types";` → `import type { ILibrarySnapshot, ITrickRecord } from "./records";`.
- Replace every `ILocalDatabaseV2` with `ILibrarySnapshot`.

Replace the whole of `packages/shared/src/library/buildSnapshot.ts` with:

```ts
import type { ILibraryFixture } from "../fixtures/library";
import type { INote } from "../schemas/note";
import type { ILibrarySnapshot, IRoutineRecord, ITrickRecord } from "./records";

const idFor = (ids: Map<string, string>, name: string, kind: string): string => {
  const id = ids.get(name);
  if (!id) throw new Error(`Unknown ${kind} in fixture: ${name}`);
  return id;
};

export const buildLibrarySnapshot = (
  fixture: ILibraryFixture,
  newId: () => string,
  now: string,
): ILibrarySnapshot => {
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

  return { tricks, routines, techniques, items, notes };
};
```

- [ ] **Step 5: Point the web app at the shared modules**

Replace `apps/web/src/api/localSchemas.ts` with:

```ts
import { z } from "zod";

import { LibrarySnapshotSchema } from "@sleightbook/shared/library/records";
import { NoteSchema } from "@sleightbook/shared/schemas/note";

export const LocalDatabaseV2Schema = LibrarySnapshotSchema.extend({ version: z.literal(2) });

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

Replace `apps/web/src/types/localDb.types.ts` with:

```ts
import type { z } from "zod";

import type { LocalDatabaseV1Schema, LocalDatabaseV2Schema } from "../api/localSchemas";

export type ILocalDatabaseV2 = z.infer<typeof LocalDatabaseV2Schema>;
export type ILocalDatabaseV1 = z.infer<typeof LocalDatabaseV1Schema>;
```

In `apps/web/src/api/migrateV1.ts`: `import { defaultRoutineOf } from "./assemble";` → `import { defaultRoutineOf } from "@sleightbook/shared/library/assemble";`.

In `apps/web/src/api/localDb.ts`:
- `import { ... } from "./assemble";` → `from "@sleightbook/shared/library/assemble";`
- `import { matchesQuery } from "./search";` → `import { matchesQuery } from "@sleightbook/shared/library/search";`
- Remove `import { buildSeedDatabase } from "./seedData";`; add `import { buildLibrarySnapshot } from "@sleightbook/shared/library/buildSnapshot";`
- `import type { ILocalDatabaseV2, IRoutineRecord, ITrickRecord } from "../types/localDb.types";` → `import type { ILocalDatabaseV2 } from "../types/localDb.types";` plus `import type { IRoutineRecord, ITrickRecord } from "@sleightbook/shared/library/records";`
- In `load()`, replace `const seeded = buildSeedDatabase(LIBRARY_FIXTURE, newId, now());` with:

```ts
    const seeded: ILocalDatabaseV2 = {
      version: 2,
      ...buildLibrarySnapshot(LIBRARY_FIXTURE, newId, now()),
    };
```

- [ ] **Step 6: Run everything**

```bash
bunx biome check --write packages/shared apps/web
bun run check
bun run test:e2e
```

Expected: lint clean, three typechecks exit 0, shared tests now include 3 more passing tests (59), engine 56 and web 60 unchanged, e2e 8 passed.

- [ ] **Step 7: Commit and push**

```bash
git add -A packages/shared apps/web
git commit -m "refactor(shared): move library records, assembly and search out of web"
git log -1 --format="%an <%ae> | %cn <%ce>%n%B"
git push origin main
```

---

### Task 2: API package, PGlite client, schema and migrations

**Files:**
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/drizzle.config.ts`, `apps/api/.env.example`
- Create: `apps/api/src/env.ts`, `apps/api/src/db/schema.ts`, `apps/api/src/db/client.ts`, `apps/api/src/db/migrate.ts`
- Generate: `apps/api/src/db/migrations/*`
- Create: `apps/api/test/helpers.ts`
- Modify: `.gitignore` (add `apps/api/.data/`)
- Test: `apps/api/test/schema.test.ts`

**Interfaces:**
- Consumes: `CATEGORIES`, `DIFFICULTIES`, `ITEM_KINDS` from `@sleightbook/shared/schemas/enums`.
- Produces:
  - Tables `users, tricks, routines, phases, actions, techniques, items, phaseTechniques, routineItems, notes` from `src/db/schema.ts`.
  - `createDb(dataDir?: string)` (no dir → in-memory), `type TDb`, `type TTx` (transaction handle); close with `db.$client.close()`.
  - `runMigrations(db: TDb): Promise<void>`, `MIGRATIONS_FOLDER`.
  - `requireEnv(name: string): string`.
  - Test helpers: `createTestDb(): Promise<TDb>`, `jsonInit(method, body): RequestInit`, `MISSING_ID`.

- [ ] **Step 1: Create package files and install dependencies**

`apps/api/package.json`:

```json
{
  "name": "@sleightbook/api",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@sleightbook/engine": "workspace:*",
    "@sleightbook/shared": "workspace:*"
  },
  "scripts": {
    "dev": "bun --watch src/index.ts",
    "db:generate": "bun --bun drizzle-kit generate",
    "db:migrate": "bun src/db/migrate.ts",
    "db:seed": "bun src/db/seed.ts",
    "test": "bun test",
    "typecheck": "tsc --noEmit"
  }
}
```

`apps/api/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "test", "drizzle.config.ts"]
}
```

`apps/api/.env.example`:

```dotenv
DATA_DIR=.data/pglite
PORT=3001
WEB_ORIGIN=http://localhost:5173
```

Append to the root `.gitignore`:

```gitignore
apps/api/.data/
```

Run:

```bash
cp apps/api/.env.example apps/api/.env
bun add --cwd apps/api hono@^4.13.13 @hono/zod-validator@^0.9.1 drizzle-orm@^0.45.4 @electric-sql/pglite@^0.5.8 zod@^4.6.5
bun add --cwd apps/api -d drizzle-kit@^0.31.11
bun install
```

- [ ] **Step 2: Write env helper, schema, client, migrate and drizzle config**

`apps/api/src/env.ts`:

```ts
export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
};
```

`apps/api/src/db/schema.ts`:

```ts
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { CATEGORIES, DIFFICULTIES, ITEM_KINDS } from "@sleightbook/shared/schemas/enums";

const id = () => uuid().primaryKey().defaultRandom();
const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
const textList = () =>
  text()
    .array()
    .notNull()
    .default(sql`'{}'::text[]`);

export const categoryEnum = pgEnum("category", CATEGORIES);
export const difficultyEnum = pgEnum("difficulty", DIFFICULTIES);
export const itemKindEnum = pgEnum("item_kind", ITEM_KINDS);

export const users = pgTable("users", {
  id: id(),
  name: text().notNull(),
  ...timestamps,
});

export const tricks = pgTable(
  "tricks",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text().notNull().default(""),
    category: categoryEnum().notNull(),
    difficulty: difficultyEnum().notNull(),
    durationMin: integer().notNull(),
    durationMax: integer().notNull(),
    isFavorite: boolean().notNull().default(false),
    ...timestamps,
  },
  (table) => [unique().on(table.userId, table.slug)],
);

export const routines = pgTable("routines", {
  id: id(),
  trickId: uuid()
    .notNull()
    .references(() => tricks.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text().notNull().default(""),
  isDefault: boolean().notNull().default(false),
  position: integer().notNull().default(0),
  tips: textList(),
  ...timestamps,
});

export const phases = pgTable(
  "phases",
  {
    id: id(),
    routineId: uuid()
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    name: text().notNull(),
    summary: text().notNull().default(""),
    explanation: text().notNull().default(""),
    spectatorText: text().notNull().default(""),
    ...timestamps,
  },
  (table) => [unique().on(table.routineId, table.position)],
);

export const actions = pgTable(
  "actions",
  {
    id: id(),
    phaseId: uuid()
      .notNull()
      .references(() => phases.id, { onDelete: "cascade" }),
    position: integer().notNull(),
    type: text().notNull(),
    params: jsonb().$type<Record<string, unknown>>().notNull(),
    durationMs: integer().notNull().default(700),
    ...timestamps,
  },
  (table) => [unique().on(table.phaseId, table.position)],
);

export const techniques = pgTable("techniques", {
  id: id(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text().notNull().default(""),
  difficulty: difficultyEnum().notNull(),
  category: text().notNull().default(""),
  tips: textList(),
  commonMistakes: textList(),
  ...timestamps,
});

export const items = pgTable("items", {
  id: id(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  kind: itemKindEnum().notNull(),
  name: text().notNull(),
  description: text().notNull().default(""),
  setupNotes: text().notNull().default(""),
  ...timestamps,
});

export const phaseTechniques = pgTable(
  "phase_techniques",
  {
    phaseId: uuid()
      .notNull()
      .references(() => phases.id, { onDelete: "cascade" }),
    techniqueId: uuid()
      .notNull()
      .references(() => techniques.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.phaseId, table.techniqueId] })],
);

export const routineItems = pgTable(
  "routine_items",
  {
    routineId: uuid()
      .notNull()
      .references(() => routines.id, { onDelete: "cascade" }),
    itemId: uuid()
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.routineId, table.itemId] })],
);

export const notes = pgTable(
  "notes",
  {
    id: id(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text().notNull(),
    trickId: uuid().references(() => tricks.id, { onDelete: "cascade" }),
    routineId: uuid().references(() => routines.id, { onDelete: "cascade" }),
    phaseId: uuid().references(() => phases.id, { onDelete: "cascade" }),
    techniqueId: uuid().references(() => techniques.id, { onDelete: "cascade" }),
    itemId: uuid().references(() => items.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  () => [
    check(
      "notes_exactly_one_target",
      sql`num_nonnulls(trick_id, routine_id, phase_id, technique_id, item_id) = 1`,
    ),
  ],
);
```

(Column names in the CHECK are raw snake_case on purpose — drizzle-kit does not apply `casing` inside `sql` templates.)

`apps/api/src/db/client.ts`:

```ts
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "./schema";

// Without a data dir PGlite runs fully in memory (used by the tests).
export const createDb = (dataDir?: string) =>
  drizzle({ client: new PGlite(dataDir), schema, casing: "snake_case" });

export type TDb = ReturnType<typeof createDb>;
export type TTx = Parameters<Parameters<TDb["transaction"]>[0]>[0];
```

`apps/api/src/db/migrate.ts`:

```ts
import { join } from "node:path";

import { migrate } from "drizzle-orm/pglite/migrator";

import { requireEnv } from "../env";
import { createDb, type TDb } from "./client";

export const MIGRATIONS_FOLDER = join(import.meta.dir, "migrations");

export const runMigrations = (db: TDb): Promise<void> =>
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

if (import.meta.main) {
  const db = createDb(requireEnv("DATA_DIR"));
  try {
    await runMigrations(db);
    console.log("Migrations applied");
  } finally {
    await db.$client.close();
  }
}
```

`apps/api/drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  casing: "snake_case",
});
```

- [ ] **Step 3: Generate the migration**

Run: `bun run --cwd apps/api db:generate`
Expected: `src/db/migrations/0000_<name>.sql` plus `meta/`. Open the SQL and confirm `CREATE TABLE "notes"` has `CONSTRAINT "notes_exactly_one_target" CHECK (num_nonnulls(trick_id, routine_id, phase_id, technique_id, item_id) = 1)` and snake_case columns such as `"spectator_text"`.

- [ ] **Step 4: Write test helpers and the schema test**

`apps/api/test/helpers.ts`:

```ts
import { createDb, type TDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";

export const MISSING_ID = "00000000-0000-4000-8000-00000000ffff";

export const createTestDb = async (): Promise<TDb> => {
  const db = createDb();
  await runMigrations(db);
  return db;
};

export const jsonInit = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
```

`apps/api/test/schema.test.ts`:

```ts
import { afterAll, describe, expect, test } from "bun:test";

import { sql } from "drizzle-orm";

import { createTestDb } from "./helpers";

const db = await createTestDb();

afterAll(async () => {
  await db.$client.close();
});

describe("database schema", () => {
  test("migrations create every table", async () => {
    const result = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    expect(result.rows.map((row) => row.table_name)).toEqual([
      "actions",
      "items",
      "notes",
      "phase_techniques",
      "phases",
      "routine_items",
      "routines",
      "techniques",
      "tricks",
      "users",
    ]);
  });
});
```

- [ ] **Step 5: Run the test**

Run: `bun run --cwd apps/api test`
Expected: PASS (1 test). This test checks the generated migration, so it is written after Step 3 rather than before.

- [ ] **Step 6: Verify, commit, push**

```bash
bunx biome check --write apps/api .gitignore
bun run check
git add .gitignore apps/api bun.lock
git status --short   # apps/api/.env must NOT be listed
git commit -m "feat(api): add api package with pglite schema and migrations"
git log -1 --format="%an <%ae> | %cn <%ce>%n%B"
git push origin main
```

Expected: `bun run check` runs `@sleightbook/api` typecheck and test along with the others, all exit 0.

---

### Task 3: Snapshot store and seed

**Files:**
- Create: `apps/api/src/services/currentUser.ts`, `apps/api/src/db/snapshot.ts`, `apps/api/src/db/seed.ts`
- Test: `apps/api/test/snapshot.test.ts`

**Interfaces:**
- Consumes: `ILibrarySnapshot`, `buildLibrarySnapshot`, `isVisualRoutineRecord` (Task 1); `LIBRARY_FIXTURE`, `ILibraryFixture`; `validateRoutine` from `@sleightbook/engine/timeline`; `ActionSchema`; tables, `TDb`, `TTx`, `createDb`, `runMigrations`, `requireEnv` (Task 2).
- Produces:
  - `DEFAULT_USER_ID`, `getCurrentUserId(): string`
  - `writeSnapshot(tx: TTx, userId: string, snapshot: ILibrarySnapshot): Promise<void>`
  - `loadSnapshot(db: TDb, userId: string): Promise<ILibrarySnapshot>` — actions re-validated with `ActionSchema.parse` (corrupt rows throw → 500).
  - `seed(db: TDb, fixture?: ILibraryFixture): Promise<ILibrarySnapshot>` — validates every visual routine with `validateRoutine`, deletes the default user (cascade) and writes the snapshot in one transaction; returns the snapshot it wrote.

- [ ] **Step 1: Write the failing test**

`apps/api/test/snapshot.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { eq } from "drizzle-orm";

import { type ILibraryFixture, LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";
import type { ILibrarySnapshot } from "@sleightbook/shared/library/records";

import { createDb } from "../src/db/client";
import { runMigrations } from "../src/db/migrate";
import { notes, tricks, users } from "../src/db/schema";
import { seed } from "../src/db/seed";
import { loadSnapshot } from "../src/db/snapshot";
import { DEFAULT_USER_ID } from "../src/services/currentUser";
import { createTestDb } from "./helpers";

const db = await createTestDb();

afterAll(async () => {
  await db.$client.close();
});

// Row order inside id lists carries no meaning; compare as sets.
const normalize = (snapshot: ILibrarySnapshot): ILibrarySnapshot => {
  const byId = <T extends { id: string }>(rows: T[]): T[] =>
    [...rows].sort((a, b) => a.id.localeCompare(b.id));
  return {
    tricks: byId(snapshot.tricks),
    routines: byId(snapshot.routines).map((routine) => ({
      ...routine,
      itemIds: [...routine.itemIds].sort(),
      phases: [...routine.phases]
        .sort((a, b) => a.position - b.position)
        .map((phase) => ({ ...phase, techniqueIds: [...phase.techniqueIds].sort() })),
    })),
    techniques: byId(snapshot.techniques),
    items: byId(snapshot.items),
    notes: byId(snapshot.notes),
  };
};

let seeded: ILibrarySnapshot;

beforeEach(async () => {
  seeded = await seed(db);
});

describe("seed + loadSnapshot", () => {
  test("loading returns exactly the snapshot that was seeded", async () => {
    expect(normalize(await loadSnapshot(db, DEFAULT_USER_ID))).toEqual(normalize(seeded));
  });

  test("seeding twice leaves one copy of the library", async () => {
    await seed(db);
    const snapshot = await loadSnapshot(db, DEFAULT_USER_ID);
    expect(snapshot.tricks).toHaveLength(6);
    expect(snapshot.routines).toHaveLength(8);
    expect(await db.select().from(users)).toHaveLength(1);
  });

  test("rejects a fixture whose visual routine is invalid", async () => {
    const [ambitious, ...rest] = LIBRARY_FIXTURE.tricks;
    // Dropping Preparation makes Standard start with doubleLift → NOT_SETUP.
    const broken: ILibraryFixture = {
      ...LIBRARY_FIXTURE,
      tricks: [
        {
          ...ambitious,
          routines: ambitious.routines.map((routine) =>
            routine.isDefault ? { ...routine, phases: routine.phases.slice(1) } : routine,
          ),
        },
        ...rest,
      ],
    };
    await expect(seed(db, broken)).rejects.toThrow("Invalid fixture routine Standard");
  });

  test("only the current user's rows are loaded", async () => {
    const otherUserId = "00000000-0000-4000-8000-000000000002";
    await db.insert(users).values({ id: otherUserId, name: "Someone else" });
    await db.insert(tricks).values({
      userId: otherUserId,
      name: "Foreign Trick",
      slug: "foreign-trick",
      category: "coin",
      difficulty: "beginner",
      durationMin: 1,
      durationMax: 2,
    });
    const names = (await loadSnapshot(db, DEFAULT_USER_ID)).tricks.map((trick) => trick.name);
    expect(names).not.toContain("Foreign Trick");
    await db.delete(users).where(eq(users.id, otherUserId));
  });

  test("the database rejects a note with two targets", async () => {
    const [trick] = seeded.tricks;
    const [routine] = seeded.routines;
    await expect(
      db.insert(notes).values({
        userId: DEFAULT_USER_ID,
        body: "two targets",
        trickId: trick?.id,
        routineId: routine?.id,
      }),
    ).rejects.toThrow();
  });
});

describe("file-backed database", () => {
  test("a file-backed database keeps data across reopen", async () => {
    const dataDir = await mkdtemp(join(tmpdir(), "sleightbook-api-"));
    try {
      const first = createDb(dataDir);
      await runMigrations(first);
      const written = await seed(first);
      const triumph = written.tricks.find((trick) => trick.slug === "triumph");
      await first.update(tricks).set({ isFavorite: true }).where(eq(tricks.id, triumph?.id ?? ""));
      await first.$client.close();

      const second = createDb(dataDir);
      const reloaded = await loadSnapshot(second, DEFAULT_USER_ID);
      await second.$client.close();
      expect(reloaded.tricks).toHaveLength(6);
      expect(reloaded.tricks.find((trick) => trick.slug === "triumph")?.isFavorite).toBe(true);
    } finally {
      await rm(dataDir, { recursive: true, force: true });
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/api test test/snapshot.test.ts`
Expected: FAIL — `Cannot find module '../src/db/seed'`.

- [ ] **Step 3: Write the implementation**

`apps/api/src/services/currentUser.ts`:

```ts
export const DEFAULT_USER_ID = "00000000-0000-4000-8000-000000000001";

// Single seam for authentication: replace this when real users arrive.
export const getCurrentUserId = (): string => DEFAULT_USER_ID;
```

`apps/api/src/db/snapshot.ts`:

```ts
import { asc, eq, getTableColumns } from "drizzle-orm";

import type { ILibrarySnapshot, IRoutineRecord } from "@sleightbook/shared/library/records";
import { ActionSchema } from "@sleightbook/shared/schemas/action";
import type { IActionRecord } from "@sleightbook/shared/schemas/routine";

import type { TDb, TTx } from "./client";
import {
  actions,
  items,
  notes,
  phaseTechniques,
  phases,
  routineItems,
  routines,
  techniques,
  tricks,
} from "./schema";

export const writeSnapshot = async (
  tx: TTx,
  userId: string,
  snapshot: ILibrarySnapshot,
): Promise<void> => {
  const phaseRows = snapshot.routines.flatMap((routine) =>
    routine.phases.map((phase) => ({ routineId: routine.id, phase })),
  );
  const actionRows = phaseRows.flatMap(({ phase }) =>
    phase.actions.map((record) => ({
      id: record.id,
      phaseId: phase.id,
      position: record.position,
      type: record.action.type,
      params: record.action.params,
      durationMs: record.durationMs,
    })),
  );
  const phaseTechniqueRows = phaseRows.flatMap(({ phase }) =>
    phase.techniqueIds.map((techniqueId) => ({ phaseId: phase.id, techniqueId })),
  );
  const routineItemRows = snapshot.routines.flatMap((routine) =>
    routine.itemIds.map((itemId) => ({ routineId: routine.id, itemId })),
  );

  if (snapshot.techniques.length > 0) {
    await tx
      .insert(techniques)
      .values(snapshot.techniques.map((technique) => ({ userId, ...technique })));
  }
  if (snapshot.items.length > 0) {
    await tx.insert(items).values(snapshot.items.map((item) => ({ userId, ...item })));
  }
  if (snapshot.tricks.length > 0) {
    await tx.insert(tricks).values(snapshot.tricks.map((trick) => ({ userId, ...trick })));
  }
  if (snapshot.routines.length > 0) {
    await tx.insert(routines).values(
      snapshot.routines.map((routine) => ({
        id: routine.id,
        trickId: routine.trickId,
        name: routine.name,
        description: routine.description,
        tips: routine.tips,
        isDefault: routine.isDefault,
        position: routine.position,
      })),
    );
  }
  if (phaseRows.length > 0) {
    await tx.insert(phases).values(
      phaseRows.map(({ routineId, phase }) => ({
        id: phase.id,
        routineId,
        position: phase.position,
        name: phase.name,
        summary: phase.summary,
        explanation: phase.explanation,
        spectatorText: phase.spectatorText,
      })),
    );
  }
  if (actionRows.length > 0) await tx.insert(actions).values(actionRows);
  if (phaseTechniqueRows.length > 0) await tx.insert(phaseTechniques).values(phaseTechniqueRows);
  if (routineItemRows.length > 0) await tx.insert(routineItems).values(routineItemRows);
  if (snapshot.notes.length > 0) {
    await tx.insert(notes).values(
      snapshot.notes.map((note) => ({
        ...note,
        userId,
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
      })),
    );
  }
};

const groupBy = <T, K>(rows: T[], keyOf: (row: T) => K): Map<K, T[]> => {
  const groups = new Map<K, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
};

export const loadSnapshot = async (db: TDb, userId: string): Promise<ILibrarySnapshot> => {
  const ownTricks = eq(tricks.userId, userId);
  const [
    trickRows,
    routineRows,
    phaseRows,
    actionRows,
    phaseTechniqueRows,
    routineItemRows,
    techniqueRows,
    itemRows,
    noteRows,
  ] = await Promise.all([
    db.select().from(tricks).where(ownTricks).orderBy(asc(tricks.name)),
    db
      .select(getTableColumns(routines))
      .from(routines)
      .innerJoin(tricks, eq(routines.trickId, tricks.id))
      .where(ownTricks)
      .orderBy(asc(routines.position)),
    db
      .select(getTableColumns(phases))
      .from(phases)
      .innerJoin(routines, eq(phases.routineId, routines.id))
      .innerJoin(tricks, eq(routines.trickId, tricks.id))
      .where(ownTricks)
      .orderBy(asc(phases.position)),
    db
      .select(getTableColumns(actions))
      .from(actions)
      .innerJoin(phases, eq(actions.phaseId, phases.id))
      .innerJoin(routines, eq(phases.routineId, routines.id))
      .innerJoin(tricks, eq(routines.trickId, tricks.id))
      .where(ownTricks)
      .orderBy(asc(actions.position)),
    db
      .select(getTableColumns(phaseTechniques))
      .from(phaseTechniques)
      .innerJoin(techniques, eq(phaseTechniques.techniqueId, techniques.id))
      .where(eq(techniques.userId, userId)),
    db
      .select(getTableColumns(routineItems))
      .from(routineItems)
      .innerJoin(items, eq(routineItems.itemId, items.id))
      .where(eq(items.userId, userId)),
    db.select().from(techniques).where(eq(techniques.userId, userId)).orderBy(asc(techniques.name)),
    db.select().from(items).where(eq(items.userId, userId)).orderBy(asc(items.name)),
    db
      .select()
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(asc(notes.createdAt), asc(notes.id)),
  ]);

  const actionsByPhase = groupBy(actionRows, (row) => row.phaseId);
  const techniquesByPhase = groupBy(phaseTechniqueRows, (row) => row.phaseId);
  const itemsByRoutine = groupBy(routineItemRows, (row) => row.routineId);
  const phasesByRoutine = groupBy(phaseRows, (row) => row.routineId);

  const toActionRecord = (row: (typeof actionRows)[number]): IActionRecord => ({
    id: row.id,
    position: row.position,
    durationMs: row.durationMs,
    action: ActionSchema.parse({ type: row.type, params: row.params }),
  });

  const routineRecords: IRoutineRecord[] = routineRows.map((routine) => ({
    id: routine.id,
    trickId: routine.trickId,
    name: routine.name,
    description: routine.description,
    tips: routine.tips,
    isDefault: routine.isDefault,
    position: routine.position,
    itemIds: (itemsByRoutine.get(routine.id) ?? []).map((row) => row.itemId),
    phases: (phasesByRoutine.get(routine.id) ?? []).map((phase) => ({
      id: phase.id,
      position: phase.position,
      name: phase.name,
      summary: phase.summary,
      explanation: phase.explanation,
      spectatorText: phase.spectatorText,
      actions: (actionsByPhase.get(phase.id) ?? []).map(toActionRecord),
      techniqueIds: (techniquesByPhase.get(phase.id) ?? []).map((row) => row.techniqueId),
    })),
  }));

  return {
    tricks: trickRows.map((trick) => ({
      id: trick.id,
      name: trick.name,
      slug: trick.slug,
      category: trick.category,
      difficulty: trick.difficulty,
      isFavorite: trick.isFavorite,
      description: trick.description,
      durationMin: trick.durationMin,
      durationMax: trick.durationMax,
    })),
    routines: routineRecords,
    techniques: techniqueRows.map((technique) => ({
      id: technique.id,
      name: technique.name,
      description: technique.description,
      difficulty: technique.difficulty,
      category: technique.category,
      tips: technique.tips,
      commonMistakes: technique.commonMistakes,
    })),
    items: itemRows.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      description: item.description,
      setupNotes: item.setupNotes,
    })),
    notes: noteRows.map((note) => ({
      id: note.id,
      body: note.body,
      trickId: note.trickId,
      routineId: note.routineId,
      phaseId: note.phaseId,
      techniqueId: note.techniqueId,
      itemId: note.itemId,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
    })),
  };
};
```

`apps/api/src/db/seed.ts`:

```ts
import { eq } from "drizzle-orm";

import { validateRoutine } from "@sleightbook/engine/timeline";
import { type ILibraryFixture, LIBRARY_FIXTURE } from "@sleightbook/shared/fixtures/library";
import { isVisualRoutineRecord } from "@sleightbook/shared/library/assemble";
import { buildLibrarySnapshot } from "@sleightbook/shared/library/buildSnapshot";
import type { ILibrarySnapshot } from "@sleightbook/shared/library/records";

import { requireEnv } from "../env";
import { DEFAULT_USER_ID } from "../services/currentUser";
import { createDb, type TDb } from "./client";
import { runMigrations } from "./migrate";
import { users } from "./schema";
import { writeSnapshot } from "./snapshot";

export const seed = async (
  db: TDb,
  fixture: ILibraryFixture = LIBRARY_FIXTURE,
): Promise<ILibrarySnapshot> => {
  const snapshot = buildLibrarySnapshot(
    fixture,
    () => crypto.randomUUID(),
    new Date().toISOString(),
  );
  for (const routine of snapshot.routines.filter(isVisualRoutineRecord)) {
    const validation = validateRoutine(routine.phases);
    if (!validation.ok) {
      throw new Error(
        `Invalid fixture routine ${routine.name}: ${validation.error.code} ${validation.error.message}`,
      );
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(users).where(eq(users.id, DEFAULT_USER_ID));
    await tx.insert(users).values({ id: DEFAULT_USER_ID, name: "Magician" });
    await writeSnapshot(tx, DEFAULT_USER_ID, snapshot);
  });
  return snapshot;
};

if (import.meta.main) {
  const db = createDb(requireEnv("DATA_DIR"));
  try {
    await runMigrations(db);
    await seed(db);
    console.log("Seed complete");
  } finally {
    await db.$client.close();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun run --cwd apps/api test`
Expected: PASS (schema 1 + snapshot 6). If the round-trip test fails on timestamps, compare `createdAt` strings: PGlite must return the same millisecond ISO string that was written.

- [ ] **Step 5: Seed the dev database**

Run: `bun run --cwd apps/api db:seed` → Expected: `Seed complete`; `apps/api/.data/pglite/` exists and is ignored by git (`git status --short` does not list it).

- [ ] **Step 6: Verify, commit, push**

```bash
bunx biome check --write apps/api
bun run check
git add apps/api
git commit -m "feat(api): seed and load the library snapshot"
git log -1 --format="%an <%ae> | %cn <%ce>%n%B"
git push origin main
```

---

### Task 4: App factory, errors, validation and read endpoints

**Files:**
- Create: `apps/api/src/errors.ts`, `apps/api/src/validate.ts`, `apps/api/src/services/libraryService.ts`
- Create: `apps/api/src/routes/tricks.ts`, `apps/api/src/routes/library.ts`, `apps/api/src/routes/routines.ts`, `apps/api/src/routes/techniques.ts`, `apps/api/src/routes/items.ts`
- Create: `apps/api/src/app.ts`, `apps/api/src/index.ts`
- Modify: `apps/api/test/helpers.ts` (add `TEST_APP_OPTIONS`)
- Test: `apps/api/test/reads.test.ts`

**Interfaces:**
- Consumes: `loadSnapshot` (Task 3), `getCurrentUserId`, shared `assemble` and `search` (Task 1), `LIBRARY_CATEGORIES`.
- Produces:
  - `class HttpError { status: 400 | 404; code: string }`, `notFound(entity: string): HttpError`
  - `zv(target, schema)` (throws `HttpError(400, "VALIDATION", …)`), `IdParamSchema`, `LibrarySearchParamsSchema` (`favoritesOnly` parsed with `z.stringbool()`).
  - `libraryService`: `listTricks(db)`, `searchTricks(db, query: IResolvedLibraryQuery)`, `getTrick(db, id)`, `getRoutine(db, id)`, `listTechniques(db)`, `getTechnique(db, id)`, `listItems(db)`, `getItem(db, id)` — names mirror `TLocalDb` so the web can switch later.
  - `createApp(db: TDb, options: IAppOptions)`, `interface IAppOptions { webOrigin: string }`, `type TApp`.
  - Endpoints: `GET /api/health`, `GET /api/tricks`, `GET /api/tricks/:id`, `GET /api/library?q=&category=&favoritesOnly=`, `GET /api/routines/:id`, `GET /api/techniques`, `GET /api/techniques/:id`, `GET /api/items`, `GET /api/items/:id`.

- [ ] **Step 1: Write the failing test**

Add to `apps/api/test/helpers.ts`:

```ts
import type { IAppOptions } from "../src/app";

export const TEST_APP_OPTIONS: IAppOptions = { webOrigin: "http://localhost:5173" };
```

`apps/api/test/reads.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, test } from "bun:test";

import { validateRoutine } from "@sleightbook/engine/timeline";
import { ApiErrorSchema } from "@sleightbook/shared/schemas/error";
import { ItemDetailSchema, ItemSummarySchema } from "@sleightbook/shared/schemas/item";
import { RoutineDetailSchema } from "@sleightbook/shared/schemas/routine";
import {
  TechniqueDetailSchema,
  TechniqueSummarySchema,
} from "@sleightbook/shared/schemas/technique";
import {
  TrickCardSchema,
  TrickDetailSchema,
  TrickSummarySchema,
} from "@sleightbook/shared/schemas/trick";

import { createApp } from "../src/app";
import { seed } from "../src/db/seed";
import { createTestDb, MISSING_ID, TEST_APP_OPTIONS } from "./helpers";

const db = await createTestDb();
const app = createApp(db, TEST_APP_OPTIONS);

beforeAll(async () => {
  await seed(db);
});

afterAll(async () => {
  await db.$client.close();
});

const getJson = async (path: string): Promise<unknown> => {
  const response = await app.request(path);
  expect(response.status).toBe(200);
  return response.json();
};

const errorCodeOf = async (path: string, status: number): Promise<string> => {
  const response = await app.request(path);
  expect(response.status).toBe(status);
  return ApiErrorSchema.parse(await response.json()).error.code;
};

const trickIdBySlug = async (slug: string): Promise<string> => {
  const tricks = TrickSummarySchema.array().parse(await getJson("/api/tricks"));
  const trick = tricks.find((candidate) => candidate.slug === slug);
  if (!trick) throw new Error(`missing ${slug}`);
  return trick.id;
};

const libraryNames = async (search: string): Promise<string[]> =>
  TrickCardSchema.array()
    .parse(await getJson(`/api/library${search}`))
    .map((card) => card.name);

describe("app", () => {
  test("GET /api/health", async () => {
    expect(await getJson("/api/health")).toEqual({ ok: true });
  });

  test("unknown routes return a JSON 404", async () => {
    expect(await errorCodeOf("/api/nope", 404)).toBe("NOT_FOUND");
  });
});

describe("tricks", () => {
  test("lists the six-trick library sorted by name", async () => {
    const tricks = TrickSummarySchema.array().parse(await getJson("/api/tricks"));
    expect(tricks.map((trick) => trick.name)).toEqual([
      "Ambitious Card",
      "Coin Matrix",
      "Oil & Water",
      "Rising Card",
      "Thought Card",
      "Triumph",
    ]);
  });

  test("assembles Ambitious Card with three routines", async () => {
    const trick = TrickDetailSchema.parse(
      await getJson(`/api/tricks/${await trickIdBySlug("ambitious-card")}`),
    );
    expect(
      trick.routines.map((routine) => [routine.name, routine.isDefault, routine.hasVisualization]),
    ).toEqual([
      ["Standard", true, true],
      ["Elmsley Version", false, false],
      ["Top Change Version", false, false],
    ]);
    expect(trick.defaultRoutineId).toBe(trick.routines[0]?.id ?? null);
    expect(trick.items.map((item) => item.name)).toEqual(["Deck of cards"]);
    expect(trick.notes).toHaveLength(1);
  });

  test("400 for a non-uuid id, 404 for a missing trick", async () => {
    expect(await errorCodeOf("/api/tricks/not-a-uuid", 400)).toBe("VALIDATION");
    expect(await errorCodeOf(`/api/tricks/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
  });
});

describe("library search", () => {
  test("empty query returns every trick as a card", async () => {
    expect(await libraryNames("")).toHaveLength(6);
    const [triumph] = TrickCardSchema.array().parse(await getJson("/api/library?q=triumph"));
    expect(triumph).toMatchObject({ phaseCount: 5, hasVisualization: true });
    expect(triumph?.techniqueNames).toEqual([
      "Packet Turnover",
      "Riffle Shuffle",
      "Spread",
      "Strip-Out Shuffle",
    ]);
  });

  test("matches techniques, items and category labels; every token must match", async () => {
    expect(await libraryNames("?q=elmsley")).toEqual(["Ambitious Card", "Oil & Water"]);
    expect(await libraryNames("?q=THREAD")).toEqual(["Rising Card"]);
    expect(await libraryNames("?q=coin%20magic")).toEqual(["Coin Matrix"]);
    expect(await libraryNames("?q=rises%20elmsley")).toEqual([]);
  });

  test("filters by category", async () => {
    expect(await libraryNames("?category=coin")).toEqual(["Coin Matrix"]);
  });

  test("library rejects a non-boolean favoritesOnly and an unknown category", async () => {
    expect(await errorCodeOf("/api/library?favoritesOnly=maybe", 400)).toBe("VALIDATION");
    expect(await errorCodeOf("/api/library?category=cards", 400)).toBe("VALIDATION");
  });
});

describe("routines", () => {
  test("returns ordered phases, sorted techniques and a valid timeline", async () => {
    const trick = TrickDetailSchema.parse(
      await getJson(`/api/tricks/${await trickIdBySlug("ambitious-card")}`),
    );
    const routine = RoutineDetailSchema.parse(
      await getJson(`/api/routines/${trick.defaultRoutineId}`),
    );
    expect(routine.phases.map((phase) => phase.name)).toEqual([
      "Preparation",
      "Double Lift",
      "Insert",
      "Snap",
      "Fan Reveal",
    ]);
    expect(routine.phases[2]?.techniques.map((technique) => technique.name)).toEqual([
      "Card Insertion",
      "Double Lift",
    ]);
    expect(validateRoutine(routine.phases)).toEqual({ ok: true });
  });

  test("Triumph's Vernon routine lists its items by name", async () => {
    const trick = TrickDetailSchema.parse(
      await getJson(`/api/tricks/${await trickIdBySlug("triumph")}`),
    );
    const vernon = RoutineDetailSchema.parse(
      await getJson(`/api/routines/${trick.defaultRoutineId}`),
    );
    expect(vernon.items.map((item) => item.name)).toEqual(["Close-up mat", "Deck of cards"]);
    expect(validateRoutine(vernon.phases)).toEqual({ ok: true });
  });

  test("404 for a missing routine", async () => {
    expect(await errorCodeOf(`/api/routines/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
  });
});

describe("techniques and items", () => {
  test("technique details list where they are used", async () => {
    const techniques = TechniqueSummarySchema.array().parse(await getJson("/api/techniques"));
    expect(techniques).toHaveLength(12);
    const doubleLift = techniques.find((technique) => technique.name === "Double Lift");
    expect(doubleLift?.usageCount).toBe(2);
    const detail = TechniqueDetailSchema.parse(await getJson(`/api/techniques/${doubleLift?.id}`));
    expect(detail.usedIn.map((usage) => [usage.routineName, usage.phaseNames])).toEqual([
      ["Standard", ["Double Lift", "Insert"]],
      ["Top Change Version", ["Show"]],
    ]);
  });

  test("item details list the routines that need them", async () => {
    const items = ItemSummarySchema.array().parse(await getJson("/api/items"));
    const deck = items.find((item) => item.name === "Deck of cards");
    expect(deck?.usageCount).toBe(7);
    const detail = ItemDetailSchema.parse(await getJson(`/api/items/${deck?.id}`));
    expect(detail.usedIn[0]).toMatchObject({ trickName: "Ambitious Card", phaseNames: [] });
  });

  test("404 for missing techniques and items", async () => {
    expect(await errorCodeOf(`/api/techniques/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
    expect(await errorCodeOf(`/api/items/${MISSING_ID}`, 404)).toBe("NOT_FOUND");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/api test test/reads.test.ts`
Expected: FAIL — `Cannot find module '../src/app'`.

- [ ] **Step 3: Write errors and validation**

`apps/api/src/errors.ts`:

```ts
export type THttpErrorStatus = 400 | 404;

export class HttpError extends Error {
  readonly status: THttpErrorStatus;
  readonly code: string;

  constructor(status: THttpErrorStatus, code: string, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export const notFound = (entity: string): HttpError =>
  new HttpError(404, "NOT_FOUND", `${entity} not found`);
```

`apps/api/src/validate.ts`:

```ts
import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

import { LIBRARY_CATEGORIES } from "@sleightbook/shared/schemas/trick";

import { HttpError } from "./errors";

export const IdParamSchema = z.object({ id: z.uuid() });

// Query strings carry text, so favoritesOnly is parsed from "true"/"false" (and 1/0, yes/no).
export const LibrarySearchParamsSchema = z.object({
  q: z.string().max(200).default(""),
  category: z.enum(LIBRARY_CATEGORIES).default("all"),
  favoritesOnly: z.stringbool().default(false),
});

export const zv = <TSchema extends z.ZodType, TTarget extends keyof ValidationTargets>(
  target: TTarget,
  schema: TSchema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join("; ");
      throw new HttpError(400, "VALIDATION", message);
    }
  });
```

- [ ] **Step 4: Write the library service**

`apps/api/src/services/libraryService.ts`:

```ts
import type { IItemDetail, IItemSummary } from "@sleightbook/shared/schemas/item";
import type { IRoutineDetail } from "@sleightbook/shared/schemas/routine";
import type { ITechniqueDetail, ITechniqueSummary } from "@sleightbook/shared/schemas/technique";
import type {
  IResolvedLibraryQuery,
  ITrickCard,
  ITrickDetail,
  ITrickSummary,
} from "@sleightbook/shared/schemas/trick";
import {
  toItemDetail,
  toItemSummary,
  toRoutineDetail,
  toTechniqueDetail,
  toTechniqueSummary,
  toTrickCard,
  toTrickDetail,
  toTrickSummary,
} from "@sleightbook/shared/library/assemble";
import type { ILibrarySnapshot } from "@sleightbook/shared/library/records";
import { matchesQuery } from "@sleightbook/shared/library/search";

import type { TDb } from "../db/client";
import { loadSnapshot } from "../db/snapshot";
import { notFound } from "../errors";
import { getCurrentUserId } from "./currentUser";

const byName = <T extends { name: string }>(a: T, b: T): number => a.name.localeCompare(b.name);

export const loadLibrary = (db: TDb): Promise<ILibrarySnapshot> =>
  loadSnapshot(db, getCurrentUserId());

const findById = <T extends { id: string }>(rows: T[], id: string, entity: string): T => {
  const row = rows.find((candidate) => candidate.id === id);
  if (!row) throw notFound(entity);
  return row;
};

export const listTricks = async (db: TDb): Promise<ITrickSummary[]> =>
  (await loadLibrary(db)).tricks.map(toTrickSummary).sort(byName);

export const searchTricks = async (
  db: TDb,
  query: IResolvedLibraryQuery,
): Promise<ITrickCard[]> => {
  const library = await loadLibrary(db);
  return library.tricks
    .filter((trick) => matchesQuery(library, trick, query))
    .map((trick) => toTrickCard(library, trick))
    .sort(byName);
};

export const getTrick = async (db: TDb, id: string): Promise<ITrickDetail> => {
  const library = await loadLibrary(db);
  return toTrickDetail(library, findById(library.tricks, id, "Trick"));
};

export const getRoutine = async (db: TDb, id: string): Promise<IRoutineDetail> => {
  const library = await loadLibrary(db);
  return toRoutineDetail(library, findById(library.routines, id, "Routine"));
};

export const listTechniques = async (db: TDb): Promise<ITechniqueSummary[]> => {
  const library = await loadLibrary(db);
  return library.techniques
    .map((technique) => toTechniqueSummary(library, technique))
    .sort(byName);
};

export const getTechnique = async (db: TDb, id: string): Promise<ITechniqueDetail> => {
  const library = await loadLibrary(db);
  return toTechniqueDetail(library, findById(library.techniques, id, "Technique"));
};

export const listItems = async (db: TDb): Promise<IItemSummary[]> => {
  const library = await loadLibrary(db);
  return library.items.map((item) => toItemSummary(library, item)).sort(byName);
};

export const getItem = async (db: TDb, id: string): Promise<IItemDetail> => {
  const library = await loadLibrary(db);
  return toItemDetail(library, findById(library.items, id, "Item"));
};
```

- [ ] **Step 5: Write the routes**

`apps/api/src/routes/tricks.ts`:

```ts
import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getTrick, listTricks } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const tricksRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listTricks(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getTrick(db, c.req.valid("param").id)),
    );
```

`apps/api/src/routes/library.ts`:

```ts
import { Hono } from "hono";

import type { TDb } from "../db/client";
import { searchTricks } from "../services/libraryService";
import { LibrarySearchParamsSchema, zv } from "../validate";

export const libraryRoutes = (db: TDb) =>
  new Hono().get("/", zv("query", LibrarySearchParamsSchema), async (c) =>
    c.json(await searchTricks(db, c.req.valid("query"))),
  );
```

`apps/api/src/routes/routines.ts`:

```ts
import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getRoutine } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const routinesRoutes = (db: TDb) =>
  new Hono().get("/:id", zv("param", IdParamSchema), async (c) =>
    c.json(await getRoutine(db, c.req.valid("param").id)),
  );
```

`apps/api/src/routes/techniques.ts`:

```ts
import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getTechnique, listTechniques } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const techniquesRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listTechniques(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getTechnique(db, c.req.valid("param").id)),
    );
```

`apps/api/src/routes/items.ts`:

```ts
import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getItem, listItems } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const itemsRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listItems(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getItem(db, c.req.valid("param").id)),
    );
```

- [ ] **Step 6: Write the app factory and server entry**

`apps/api/src/app.ts`:

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";

import type { TDb } from "./db/client";
import { HttpError } from "./errors";
import { itemsRoutes } from "./routes/items";
import { libraryRoutes } from "./routes/library";
import { routinesRoutes } from "./routes/routines";
import { techniquesRoutes } from "./routes/techniques";
import { tricksRoutes } from "./routes/tricks";

export interface IAppOptions {
  webOrigin: string;
}

export const createApp = (db: TDb, options: IAppOptions) => {
  const app = new Hono()
    .basePath("/api")
    .use(cors({ origin: options.webOrigin }))
    .get("/health", (c) => c.json({ ok: true }))
    .route("/tricks", tricksRoutes(db))
    .route("/library", libraryRoutes(db))
    .route("/routines", routinesRoutes(db))
    .route("/techniques", techniquesRoutes(db))
    .route("/items", itemsRoutes(db));

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.status);
    }
    console.error(error);
    return c.json({ error: { code: "INTERNAL", message: "Internal server error" } }, 500);
  });

  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));

  return app;
};

export type TApp = ReturnType<typeof createApp>;
```

`apps/api/src/index.ts`:

```ts
import { createApp } from "./app";
import { createDb } from "./db/client";
import { runMigrations } from "./db/migrate";
import { requireEnv } from "./env";

const db = createDb(requireEnv("DATA_DIR"));
await runMigrations(db);

const app = createApp(db, { webOrigin: requireEnv("WEB_ORIGIN") });
const port = Number(requireEnv("PORT"));

console.log(`Sleightbook API listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `bun run --cwd apps/api test`
Expected: PASS (schema, snapshot, reads).

- [ ] **Step 8: Smoke-test the dev server**

Run `bun run --cwd apps/api dev` in the background (the dev DB was seeded in Task 3), then:

```bash
curl -s http://localhost:3001/api/tricks
curl -s "http://localhost:3001/api/library?q=thread"
```

Expected: six tricks; a one-element array containing `"name":"Rising Card"`. Stop the server.

- [ ] **Step 9: Verify, commit, push**

```bash
bunx biome check --write apps/api
bun run check
git add apps/api
git commit -m "feat(api): add read endpoints for tricks, library, routines, techniques and items"
git log -1 --format="%an <%ae> | %cn <%ce>%n%B"
git push origin main
```

---

### Task 5: Favorites and notes

**Files:**
- Create: `apps/api/src/services/noteService.ts`, `apps/api/src/routes/notes.ts`
- Modify: `apps/api/src/services/libraryService.ts` (add `setFavorite`), `apps/api/src/routes/tricks.ts` (add PATCH), `apps/api/src/app.ts` (mount notes)
- Test: `apps/api/test/writes.test.ts`

**Interfaces:**
- Consumes: `UpdateTrickSchema`, `CreateNoteSchema`, `UpdateNoteSchema`, `ICreateNoteInput`, `INote`; tables; `loadLibrary`, `getTrick` (Task 4); `HttpError`, `notFound`, `zv`, `IdParamSchema`.
- Produces:
  - `setFavorite(db, id, isFavorite): Promise<ITrickDetail>` — 404 if missing.
  - `createNote(db, input): Promise<INote>` — `400 NOT_SUPPORTED` for `routineId`; `404 Note target not found` if the target is missing or belongs to another user.
  - `updateNote(db, id, body): Promise<INote>`, `deleteNote(db, id): Promise<void>` — 404 if missing.
  - Endpoints: `PATCH /api/tricks/:id` → 200, `POST /api/notes` → 201, `PATCH /api/notes/:id` → 200, `DELETE /api/notes/:id` → 204.

- [ ] **Step 1: Write the failing test**

`apps/api/test/writes.test.ts`:

```ts
import { afterAll, beforeEach, describe, expect, test } from "bun:test";

import { ApiErrorSchema } from "@sleightbook/shared/schemas/error";
import { ItemDetailSchema, ItemSummarySchema } from "@sleightbook/shared/schemas/item";
import { NoteSchema } from "@sleightbook/shared/schemas/note";
import { RoutineDetailSchema } from "@sleightbook/shared/schemas/routine";
import {
  TechniqueDetailSchema,
  TechniqueSummarySchema,
} from "@sleightbook/shared/schemas/technique";
import {
  TrickCardSchema,
  TrickDetailSchema,
  TrickSummarySchema,
} from "@sleightbook/shared/schemas/trick";

import { createApp } from "../src/app";
import { seed } from "../src/db/seed";
import { createTestDb, jsonInit, MISSING_ID, TEST_APP_OPTIONS } from "./helpers";

const db = await createTestDb();
const app = createApp(db, TEST_APP_OPTIONS);

beforeEach(async () => {
  await seed(db);
});

afterAll(async () => {
  await db.$client.close();
});

const getJson = async (path: string): Promise<unknown> => (await app.request(path)).json();

const send = (method: string, path: string, body?: unknown): Promise<Response> =>
  app.request(path, body === undefined ? { method } : jsonInit(method, body));

const errorCode = async (response: Response): Promise<string> =>
  ApiErrorSchema.parse(await response.json()).error.code;

const getTriumph = async () => {
  const tricks = TrickSummarySchema.array().parse(await getJson("/api/tricks"));
  const id = tricks.find((trick) => trick.slug === "triumph")?.id;
  const trick = TrickDetailSchema.parse(await getJson(`/api/tricks/${id}`));
  const routine = RoutineDetailSchema.parse(
    await getJson(`/api/routines/${trick.defaultRoutineId}`),
  );
  return { trick, routine };
};

const createNote = async (payload: Record<string, unknown>) => {
  const response = await send("POST", "/api/notes", payload);
  expect(response.status).toBe(201);
  return NoteSchema.parse(await response.json());
};

describe("PATCH /api/tricks/:id", () => {
  test("sets and persists the favorite flag, and favoritesOnly filters on it", async () => {
    const { trick } = await getTriumph();
    const response = await send("PATCH", `/api/tricks/${trick.id}`, { isFavorite: true });
    expect(response.status).toBe(200);
    expect(TrickDetailSchema.parse(await response.json()).isFavorite).toBe(true);
    expect(TrickDetailSchema.parse(await getJson(`/api/tricks/${trick.id}`)).isFavorite).toBe(true);

    const favorites = TrickCardSchema.array().parse(
      await getJson("/api/library?favoritesOnly=true"),
    );
    expect(favorites.map((card) => card.name)).toEqual(["Triumph"]);
  });

  test("400 for unknown fields, 404 for a missing trick", async () => {
    const { trick } = await getTriumph();
    expect((await send("PATCH", `/api/tricks/${trick.id}`, { name: "Hacked" })).status).toBe(400);
    expect((await send("PATCH", `/api/tricks/${MISSING_ID}`, { isFavorite: true })).status).toBe(
      404,
    );
  });
});

describe("notes", () => {
  test("notes on tricks, phases, techniques and items show up on their owners", async () => {
    const { trick, routine } = await getTriumph();
    const phaseId = routine.phases[2]?.id;
    const [technique] = TechniqueSummarySchema.array().parse(await getJson("/api/techniques"));
    const [item] = ItemSummarySchema.array().parse(await getJson("/api/items"));

    const trickNote = await createNote({ body: "Trick note", trickId: trick.id });
    await createNote({ body: "Phase note", phaseId });
    const techniqueNote = await createNote({ body: "Technique note", techniqueId: technique?.id });
    const itemNote = await createNote({ body: "Item note", itemId: item?.id });

    expect(
      TrickDetailSchema.parse(await getJson(`/api/tricks/${trick.id}`)).notes.map((n) => n.id),
    ).toEqual([trickNote.id]);
    const reread = RoutineDetailSchema.parse(await getJson(`/api/routines/${routine.id}`));
    expect(reread.phases[2]?.notes.map((note) => note.body)).toEqual(["Phase note"]);
    const techniqueDetail = TechniqueDetailSchema.parse(
      await getJson(`/api/techniques/${technique?.id}`),
    );
    expect(techniqueDetail.notes.map((note) => note.id)).toEqual([techniqueNote.id]);
    const itemDetail = ItemDetailSchema.parse(await getJson(`/api/items/${item?.id}`));
    expect(itemDetail.notes.map((note) => note.id)).toEqual([itemNote.id]);
  });

  test("search finds text from a note created through the API", async () => {
    const { routine } = await getTriumph();
    await createNote({ body: "Shaky hands on the turnover", phaseId: routine.phases[1]?.id });
    const cards = TrickCardSchema.array().parse(await getJson("/api/library?q=shaky"));
    expect(cards.map((card) => card.name)).toEqual(["Triumph"]);
  });

  test("trims the body and rejects blank bodies", async () => {
    const { trick } = await getTriumph();
    expect((await createNote({ body: "  Padded  ", trickId: trick.id })).body).toBe("Padded");
    const blank = await send("POST", "/api/notes", { body: "   ", trickId: trick.id });
    expect(blank.status).toBe(400);
    expect(await errorCode(blank)).toBe("VALIDATION");
  });

  test("400 for zero or two targets, 400 NOT_SUPPORTED for routine notes", async () => {
    const { trick, routine } = await getTriumph();
    expect((await send("POST", "/api/notes", { body: "orphan" })).status).toBe(400);
    expect(
      (
        await send("POST", "/api/notes", {
          body: "both",
          trickId: trick.id,
          phaseId: routine.phases[0]?.id,
        })
      ).status,
    ).toBe(400);
    const routineNote = await send("POST", "/api/notes", { body: "r", routineId: routine.id });
    expect(routineNote.status).toBe(400);
    expect(await errorCode(routineNote)).toBe("NOT_SUPPORTED");
  });

  test("404 when the target does not exist", async () => {
    const response = await send("POST", "/api/notes", { body: "ghost", techniqueId: MISSING_ID });
    expect(response.status).toBe(404);
  });

  test("updates the body and bumps updatedAt", async () => {
    const { trick } = await getTriumph();
    const created = await createNote({ body: "Draft", trickId: trick.id });
    const response = await send("PATCH", `/api/notes/${created.id}`, { body: "Final" });
    expect(response.status).toBe(200);
    const updated = NoteSchema.parse(await response.json());
    expect(updated.body).toBe("Final");
    expect(updated.updatedAt >= created.updatedAt).toBe(true);
    expect((await send("PATCH", `/api/notes/${MISSING_ID}`, { body: "x" })).status).toBe(404);
  });

  test("deleting twice returns 404 the second time", async () => {
    const { trick } = await getTriumph();
    const created = await createNote({ body: "Temp", trickId: trick.id });
    expect((await send("DELETE", `/api/notes/${created.id}`)).status).toBe(204);
    expect(TrickDetailSchema.parse(await getJson(`/api/tricks/${trick.id}`)).notes).toEqual([]);
    expect((await send("DELETE", `/api/notes/${created.id}`)).status).toBe(404);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run --cwd apps/api test test/writes.test.ts`
Expected: FAIL — PATCH and `/api/notes` requests return 404 `Route not found`.

- [ ] **Step 3: Add setFavorite to the library service**

Append to `apps/api/src/services/libraryService.ts` (add `and`/`eq` from `drizzle-orm` and `tricks` from `../db/schema` to the imports):

```ts
export const setFavorite = async (
  db: TDb,
  id: string,
  isFavorite: boolean,
): Promise<ITrickDetail> => {
  const updated = await db
    .update(tricks)
    .set({ isFavorite })
    .where(and(eq(tricks.id, id), eq(tricks.userId, getCurrentUserId())))
    .returning({ id: tricks.id });
  if (updated.length === 0) throw notFound("Trick");
  return getTrick(db, id);
};
```

In `apps/api/src/routes/tricks.ts` import `UpdateTrickSchema` from `@sleightbook/shared/schemas/trick` and `setFavorite` from the service, drop the `;` after the `.get("/:id", …)` call, and chain:

```ts
    .patch("/:id", zv("param", IdParamSchema), zv("json", UpdateTrickSchema), async (c) =>
      c.json(await setFavorite(db, c.req.valid("param").id, c.req.valid("json").isFavorite)),
    );
```

- [ ] **Step 4: Write the note service and route**

`apps/api/src/services/noteService.ts`:

```ts
import { and, eq } from "drizzle-orm";

import type { ICreateNoteInput, INote } from "@sleightbook/shared/schemas/note";

import type { TDb } from "../db/client";
import { notes } from "../db/schema";
import { HttpError, notFound } from "../errors";
import { getCurrentUserId } from "./currentUser";
import { loadLibrary } from "./libraryService";

const toNoteDto = (row: typeof notes.$inferSelect): INote => ({
  id: row.id,
  body: row.body,
  trickId: row.trickId,
  routineId: row.routineId,
  phaseId: row.phaseId,
  techniqueId: row.techniqueId,
  itemId: row.itemId,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const targetExists = async (db: TDb, input: ICreateNoteInput): Promise<boolean> => {
  const library = await loadLibrary(db);
  if (input.trickId) return library.tricks.some((trick) => trick.id === input.trickId);
  if (input.phaseId) {
    return library.routines.some((routine) =>
      routine.phases.some((phase) => phase.id === input.phaseId),
    );
  }
  if (input.techniqueId) {
    return library.techniques.some((technique) => technique.id === input.techniqueId);
  }
  if (input.itemId) return library.items.some((item) => item.id === input.itemId);
  return false;
};

export const createNote = async (db: TDb, input: ICreateNoteInput): Promise<INote> => {
  // Matches local mode: no DTO shows routine-level notes yet.
  if (input.routineId) {
    throw new HttpError(400, "NOT_SUPPORTED", "Routine notes are not supported");
  }
  if (!(await targetExists(db, input))) throw notFound("Note target");

  const [row] = await db
    .insert(notes)
    .values({
      userId: getCurrentUserId(),
      body: input.body,
      trickId: input.trickId ?? null,
      phaseId: input.phaseId ?? null,
      techniqueId: input.techniqueId ?? null,
      itemId: input.itemId ?? null,
    })
    .returning();
  return toNoteDto(row);
};

export const updateNote = async (db: TDb, id: string, body: string): Promise<INote> => {
  const [row] = await db
    .update(notes)
    .set({ body })
    .where(and(eq(notes.id, id), eq(notes.userId, getCurrentUserId())))
    .returning();
  if (!row) throw notFound("Note");
  return toNoteDto(row);
};

export const deleteNote = async (db: TDb, id: string): Promise<void> => {
  const deleted = await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, getCurrentUserId())))
    .returning({ id: notes.id });
  if (deleted.length === 0) throw notFound("Note");
};
```

`apps/api/src/routes/notes.ts`:

```ts
import { Hono } from "hono";

import { CreateNoteSchema, UpdateNoteSchema } from "@sleightbook/shared/schemas/note";

import type { TDb } from "../db/client";
import { createNote, deleteNote, updateNote } from "../services/noteService";
import { IdParamSchema, zv } from "../validate";

export const notesRoutes = (db: TDb) =>
  new Hono()
    .post("/", zv("json", CreateNoteSchema), async (c) =>
      c.json(await createNote(db, c.req.valid("json")), 201),
    )
    .patch("/:id", zv("param", IdParamSchema), zv("json", UpdateNoteSchema), async (c) =>
      c.json(await updateNote(db, c.req.valid("param").id, c.req.valid("json").body)),
    )
    .delete("/:id", zv("param", IdParamSchema), async (c) => {
      await deleteNote(db, c.req.valid("param").id);
      return c.body(null, 204);
    });
```

In `apps/api/src/app.ts` import `notesRoutes` and chain `.route("/notes", notesRoutes(db))` after `.route("/items", itemsRoutes(db))`.

- [ ] **Step 5: Run tests to verify they pass**

Run: `bun run --cwd apps/api test`
Expected: PASS (schema, snapshot, reads, writes).

- [ ] **Step 6: Verify, commit, push**

```bash
bunx biome check --write apps/api
bun run check
git add apps/api
git commit -m "feat(api): add favorite and note endpoints"
git log -1 --format="%an <%ae> | %cn <%ce>%n%B"
git push origin main
```

---

### Task 6: Workspace scripts, README and CI confirmation

**Files:**
- Modify: `package.json` (root scripts), `README.md`
- Modify: `apps/web/src/api/localDb.ts` (comment only: the API now exists but is not wired)

**Interfaces:**
- Produces: root scripts `dev:api` and `db:seed`; README section "API".

- [ ] **Step 1: Root scripts**

In the root `package.json` `scripts`, add after `"dev"`:

```json
    "dev:api": "bun run --cwd apps/api dev",
    "db:seed": "bun run --cwd apps/api db:seed",
```

Keep `db:up` / `db:down` and `docker-compose.yml`: they remain the path to a real Postgres later.

- [ ] **Step 2: README**

Replace the status note under the title with:

```markdown
> Status: the web app runs on a **local data layer** (browser localStorage, seeded with the six-trick library).
> A standalone API (`apps/api`: Hono + Drizzle on PGlite) serves the same data; the web app is not wired to it yet.
```

Add before `## Verify`:

````markdown
## API (optional)

```bash
cp apps/api/.env.example apps/api/.env
bun run db:seed
bun run dev:api
```

API: http://localhost:3001/api — data lives in `apps/api/.data/pglite` (stop the API before re-seeding).
````

- [ ] **Step 3: Update the stale comment in `apps/web/src/api/localDb.ts`**

Replace `// App instance. Replaced by the Hono client once the API (Part 2) exists.` with `// App instance. apps/api serves the same contract; switching the web to it is a separate step.`

- [ ] **Step 4: Full verification**

```bash
bunx biome check --write .
bun run check
bun run test:e2e
```

Expected: lint clean; four typechecks and four test suites exit 0; e2e 8 passed.

- [ ] **Step 5: Commit, push, confirm CI**

```bash
git add package.json README.md apps/web/src/api/localDb.ts
git commit -m "docs(api): document running the api and add workspace scripts"
git log -1 --format="%an <%ae> | %cn <%ce>%n%B"
git push origin main
gh run list --commit "$(git rev-parse HEAD)"
```

Expected: CI and Deploy both `success` (use `gh run watch <id> --exit-status`).
