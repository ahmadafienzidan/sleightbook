import { defineConfig } from "@playwright/test";

import baseConfig from "./playwright.config";

const API_PORT = 3101;
const WEB_PORT = 5175;

// Same specs as playwright.config.ts, but the web talks to a fresh in-memory apps/api.
export default defineConfig({
  ...baseConfig,
  use: { ...baseConfig.use, baseURL: `http://localhost:${WEB_PORT}` },
  webServer: [
    {
      command: "bun src/index.ts",
      cwd: "../api",
      url: `http://localhost:${API_PORT}/api/health`,
      env: {
        DATA_DIR: "memory://",
        PORT: String(API_PORT),
        WEB_ORIGIN: `http://localhost:${WEB_PORT}`,
      },
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `bunx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { VITE_API_URL: `http://localhost:${API_PORT}/api` },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
