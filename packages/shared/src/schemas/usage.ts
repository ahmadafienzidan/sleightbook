import { z } from "zod";

export const UsageSchema = z.object({
  trickId: z.uuid(),
  trickName: z.string(),
  routineId: z.uuid(),
  routineName: z.string(),
  phaseNames: z.array(z.string()),
});
export type IUsage = z.infer<typeof UsageSchema>;
