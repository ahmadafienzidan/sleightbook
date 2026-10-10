import { createApp } from "./app";
import { createDb } from "./db/client";
import { runMigrations } from "./db/migrate";
import { seedIfEmpty } from "./db/seed";
import { requireEnv } from "./env";

const db = createDb(requireEnv("DATA_DIR"));
await runMigrations(db);
if (await seedIfEmpty(db)) console.log("Seeded an empty database with the sample library");

const app = createApp(db, { webOrigin: requireEnv("WEB_ORIGIN") });
const port = Number(requireEnv("PORT"));

console.log(`Sleightbook API listening on http://localhost:${port}`);

export default { port, fetch: app.fetch };
