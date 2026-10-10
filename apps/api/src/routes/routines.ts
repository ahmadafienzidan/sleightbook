import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getRoutine } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const routinesRoutes = (db: TDb) =>
  new Hono().get("/:id", zv("param", IdParamSchema), async (c) =>
    c.json(await getRoutine(db, c.req.valid("param").id)),
  );
