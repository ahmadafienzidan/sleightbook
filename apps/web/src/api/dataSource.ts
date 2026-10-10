import { createHttpDb } from "./httpDb";
import { localDb } from "./localDb";

// With VITE_API_URL (e.g. http://localhost:3001/api) the web talks to apps/api; without it,
// data stays in this browser's localStorage, which is what the static GitHub Pages build uses.
const apiUrl = import.meta.env.VITE_API_URL;

export const dataSource = apiUrl ? createHttpDb(apiUrl, fetch) : localDb;
