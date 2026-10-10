import { Hono } from "hono";

import type { TDb } from "../db/client";
import { getItem, listItems } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const itemsRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listItems(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getItem(db, c.req.valid("param").id)),
    );
