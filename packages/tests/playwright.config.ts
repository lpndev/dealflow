import { fileURLToPath } from "node:url"
import { defineConfig, devices } from "@playwright/test"

const root = fileURLToPath(new URL("../..", import.meta.url))
const API_PORT = 3011
const WEB_PORT = 4321
const API_URL = `http://localhost:${API_PORT}`
const WEB_URL = `http://localhost:${WEB_PORT}`

const apiEnv = {
  NODE_ENV: "test",
  DATABASE_URL: ":memory:",
  HOST: "127.0.0.1",
  PORT: String(API_PORT),
  DEALFLOW_FAKE_ML: "1",
  DEALFLOW_FAKE_WA: "1",
  DEALFLOW_E2E: "1",
  BETTER_AUTH_URL: API_URL,
  BETTER_AUTH_SECRET: "e2e-secret-not-a-real-secret",
  TRUSTED_ORIGINS: WEB_URL
}

export default defineConfig({
  testDir: "./e2e",
  // serial + single worker: every spec shares one in-memory API/db
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  use: { baseURL: WEB_URL, trace: "retain-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "bun run src/index.ts",
      cwd: `${root}apps/api`,
      url: `${API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: apiEnv
    },
    {
      command: `bun run build && bun run preview -- --port ${WEB_PORT} --strictPort`,
      cwd: `${root}apps/panel`,
      url: WEB_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: { VITE_API_URL: API_URL }
    }
  ]
})
