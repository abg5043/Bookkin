import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined) {
  throw new Error("DATABASE_URL must explicitly name the disposable local PostgreSQL test database.");
}

let parsed;
try {
  parsed = new URL(databaseUrl);
} catch {
  throw new Error("DATABASE_URL must be an explicit disposable PostgreSQL URL.");
}

const databaseName = parsed.pathname.slice(1);
if (
  !["postgres:", "postgresql:"].includes(parsed.protocol)
  || !["127.0.0.1", "localhost", "::1"].includes(parsed.hostname)
  || !/(?:_test|_ci)$/u.test(databaseName)
) {
  throw new Error("Database integrity tests require a loopback PostgreSQL database whose name ends in _test or _ci.");
}

const vitestCli = path.join(projectRoot, "node_modules", "vitest", "vitest.mjs");
execFileSync(process.execPath, [
  vitestCli,
  "run",
  "tests/integration/checkpoint-5b-data-integrity.test.ts",
  "tests/integration/checkpoint-7a-family-context.test.ts",
  "tests/integration/checkpoint-7a-candidate-pool.test.ts",
  "--reporter=verbose",
], {
  cwd: projectRoot,
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    BOOKKIN_REQUIRE_DB_TESTS: "true",
  },
  stdio: "inherit",
});
