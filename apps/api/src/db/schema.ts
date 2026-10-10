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
const textList = () => text().array().notNull().default(sql`'{}'::text[]`);

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
