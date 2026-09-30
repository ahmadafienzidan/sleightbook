import { z } from "zod";

import { ActionSchema } from "./action";
import { DIFFICULTIES } from "./enums";
import { NoteSchema } from "./note";
import { ItemSchema } from "./trick";

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
  items: z.array(ItemSchema),
  phases: z.array(PhaseSchema),
});
export type IRoutineDetail = z.infer<typeof RoutineDetailSchema>;
