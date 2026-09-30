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
  hasVisualization: z.boolean(),
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
