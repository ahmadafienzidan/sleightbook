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
