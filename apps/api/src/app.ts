import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";

import type { TDb } from "./db/client";
import { HttpError } from "./errors";
import { itemsRoutes } from "./routes/items";
import { libraryRoutes } from "./routes/library";
import { notesRoutes } from "./routes/notes";
import { routinesRoutes } from "./routes/routines";
import { techniquesRoutes } from "./routes/techniques";
import { tricksRoutes } from "./routes/tricks";

export interface IAppOptions {
  webOrigin: string;
}

export const createApp = (db: TDb, options: IAppOptions) => {
  const app = new Hono()
    .basePath("/api")
    .use(cors({ origin: options.webOrigin }))
    .get("/health", (c) => c.json({ ok: true }))
    .route("/tricks", tricksRoutes(db))
    .route("/library", libraryRoutes(db))
    .route("/routines", routinesRoutes(db))
    .route("/techniques", techniquesRoutes(db))
    .route("/items", itemsRoutes(db))
    .route("/notes", notesRoutes(db));

  app.onError((error, c) => {
    if (error instanceof HttpError) {
      return c.json({ error: { code: error.code, message: error.message } }, error.status);
    }
    // Hono raises HTTPException(400) for malformed request bodies before our validators run.
    if (error instanceof HTTPException && error.status === 400) {
      return c.json({ error: { code: "VALIDATION", message: error.message } }, 400);
    }
    console.error(error);
    return c.json({ error: { code: "INTERNAL", message: "Internal server error" } }, 500);
  });

  app.notFound((c) => c.json({ error: { code: "NOT_FOUND", message: "Route not found" } }, 404));

  return app;
};

export type TApp = ReturnType<typeof createApp>;
