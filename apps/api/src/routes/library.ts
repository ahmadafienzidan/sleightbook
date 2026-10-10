import { Hono } from "hono";

import type { TDb } from "../db/client";
import { searchTricks } from "../services/libraryService";
import { LibrarySearchParamsSchema, zv } from "../validate";

export const libraryRoutes = (db: TDb) =>
  new Hono().get("/", zv("query", LibrarySearchParamsSchema), async (c) =>
    c.json(await searchTricks(db, c.req.valid("query"))),
  );
