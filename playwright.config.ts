import { defineConfig, devices } from "@playwright/test";

const TEST_DATABASE_URL =
  "postgresql://raphaelmilanramos@localhost:5432/helpdesk_test?schema=public";

const TEST_AUTH_SECRET =
  "playwright-e2e-test-secret-do-not-use-in-production!!";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  globalSetup: "./e2e/global-setup.ts",
  webServer: [
    {
      command: "cd server && ~/.bun/bin/bun run src/index.ts",
      port: 3000,
      reuseExistingServer: !process.env.CI,
      env: {
        DATABASE_URL: TEST_DATABASE_URL,
        BETTER_AUTH_SECRET: TEST_AUTH_SECRET,
        BETTER_AUTH_URL: "http://localhost:3000",
        TRUSTED_ORIGINS: "http://localhost:5173",
        NODE_ENV: "test",
      },
    },
    {
      command: "cd client && ~/.bun/bin/bun run dev",
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
