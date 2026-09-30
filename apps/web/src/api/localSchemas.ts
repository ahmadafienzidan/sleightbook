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
