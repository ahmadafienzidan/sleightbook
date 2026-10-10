import { Hono } from "hono";

import { CreateNoteSchema, UpdateNoteSchema } from "@sleightbook/shared/schemas/note";

import type { TDb } from "../db/client";
import { createNote, deleteNote, updateNote } from "../services/noteService";
import { IdParamSchema, zv } from "../validate";

export const notesRoutes = (db: TDb) =>
  new Hono()
    .post("/", zv("json", CreateNoteSchema), async (c) =>
      c.json(await createNote(db, c.req.valid("json")), 201),
    )
    .patch("/:id", zv("param", IdParamSchema), zv("json", UpdateNoteSchema), async (c) =>
      c.json(await updateNote(db, c.req.valid("param").id, c.req.valid("json").body)),
    )
    .delete("/:id", zv("param", IdParamSchema), async (c) => {
      await deleteNote(db, c.req.valid("param").id);
      return c.body(null, 204);
    });
