import { z } from "zod";

import { NoteSchema } from "./note";
import { ItemSchema } from "./trick";
import { UsageSchema } from "./usage";

export const ItemSummarySchema = ItemSchema.extend({ usageCount: z.number().int() });
export type IItemSummary = z.infer<typeof ItemSummarySchema>;

export const ItemDetailSchema = ItemSchema.extend({
  usedIn: z.array(UsageSchema),
  notes: z.array(NoteSchema),
});
export type IItemDetail = z.infer<typeof ItemDetailSchema>;
