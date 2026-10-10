import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getTrick, listTricks } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const tricksRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listTricks(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getTrick(db, c.req.valid("param").id)),
    );
