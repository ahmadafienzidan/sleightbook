import { Hono } from "hono";

import { UpdateTrickSchema } from "@sleightbook/shared/schemas/trick";

import type { TDb } from "../db/client";
import { getTrick, listTricks, setFavorite } from "../services/libraryService";
import { IdParamSchema, zv } from "../validate";

export const tricksRoutes = (db: TDb) =>
  new Hono()
    .get("/", async (c) => c.json(await listTricks(db)))
    .get("/:id", zv("param", IdParamSchema), async (c) =>
      c.json(await getTrick(db, c.req.valid("param").id)),
    )
    .patch("/:id", zv("param", IdParamSchema), zv("json", UpdateTrickSchema), async (c) =>
      c.json(await setFavorite(db, c.req.valid("param").id, c.req.valid("json").isFavorite)),
    );
