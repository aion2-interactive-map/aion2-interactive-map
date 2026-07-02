import { defineConfig, devices } from "@playwright/test";

const port = process.env.E2E_PORT ?? "5173";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  webServer: {
    command: `pnpm dev --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
