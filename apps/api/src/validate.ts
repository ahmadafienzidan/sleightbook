import { zValidator } from "@hono/zod-validator";
import type { ValidationTargets } from "hono";
import { z } from "zod";

import { LIBRARY_CATEGORIES } from "@sleightbook/shared/schemas/trick";

import { HttpError } from "./errors";

export const IdParamSchema = z.object({ id: z.uuid() });

// Query strings carry text, so favoritesOnly is parsed from "true"/"false" (and 1/0, yes/no).
export const LibrarySearchParamsSchema = z.object({
  q: z.string().max(200).default(""),
  category: z.enum(LIBRARY_CATEGORIES).default("all"),
  favoritesOnly: z.stringbool().default(false),
});

export const zv = <TSchema extends z.ZodType, TTarget extends keyof ValidationTargets>(
  target: TTarget,
  schema: TSchema,
) =>
  zValidator(target, schema, (result) => {
    if (!result.success) {
      const message = result.error.issues.map((issue) => issue.message).join("; ");
      throw new HttpError(400, "VALIDATION", message);
    }
  });
