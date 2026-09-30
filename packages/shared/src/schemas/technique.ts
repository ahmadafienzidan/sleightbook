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
