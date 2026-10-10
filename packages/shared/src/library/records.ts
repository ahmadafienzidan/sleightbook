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
