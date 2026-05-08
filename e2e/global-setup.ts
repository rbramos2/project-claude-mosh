import { execSync } from "child_process";
import path from "path";

const TEST_DATABASE_URL =
  "postgresql://raphaelmilanramos@localhost:5432/helpdesk_test?schema=public";

const serverDir = path.resolve(__dirname, "../server");

const env = {
  ...process.env,
  DATABASE_URL: TEST_DATABASE_URL,
  BETTER_AUTH_SECRET: "playwright-e2e-test-secret-do-not-use-in-production!!",
  BETTER_AUTH_URL: "http://localhost:3000",
  SEED_ADMIN_EMAIL: "admin@example.com",
  SEED_ADMIN_PASSWORD: "password123",
  SEED_ADMIN_NAME: "Admin",
};

export default async function globalSetup() {
  execSync("node_modules/.bin/prisma migrate deploy", {
    cwd: serverDir,
    env,
    stdio: "inherit",
  });

  execSync("~/.bun/bin/bun run src/seed.ts", {
    cwd: serverDir,
    env,
    stdio: "inherit",
  });
}
