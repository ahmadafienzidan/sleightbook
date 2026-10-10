import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getTechnique, listTechniques } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const techniquesRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listTechniques(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getTechnique(db, c.req.valid("param").id)),
    );
