import { z } from "zod";

export const NOTE_TARGET_KEYS = [
  "trickId",
  "routineId",
  "phaseId",
  "techniqueId",
  "itemId",
] as const;
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
