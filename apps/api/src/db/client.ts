import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "./schema";

// Without a data dir PGlite runs fully in memory (used by the tests).
export const createDb = (dataDir?: string) =>
  drizzle({ client: new PGlite(dataDir), schema, casing: "snake_case" });

export type TDb = ReturnType<typeof createDb>;
export type TTx = Parameters<Parameters<TDb["transaction"]>[0]>[0];
