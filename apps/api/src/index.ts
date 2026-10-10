import { createApp } from "./app";
import { createDb } from "./db/client";
import { runMigrations } from "./db/migrate";
import { requireEnv } from "./env";

const db = createDb(requireEnv("DATA_DIR"));
await runMigrations(db);

const app = createApp(db, { webOrigin: requireEnv("WEB_ORIGIN") });
const port = Number(requireEnv("PORT"));

console.log(`Sleightbook API listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };
