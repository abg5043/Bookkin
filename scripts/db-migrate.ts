import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCommand = process.execPath;
const prismaCliPath = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = "prisma/schema.prisma";
const migrationDirectory = path.join(projectRoot, "prisma", "migrations");

function runPrisma(args: string[], input?: string): void {
  const command = [prismaCliPath, ...args];

  if (input === undefined) {
    execFileSync(prismaCommand, command, {
      cwd: projectRoot,
      env: process.env,
      stdio: "inherit",
    });
    return;
  }

  execFileSync(prismaCommand, command, {
    cwd: projectRoot,
    env: process.env,
    input,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

function localSqlitePath(): string | undefined {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || !databaseUrl.startsWith("file:")) {
    return undefined;
  }

  const databasePath = databaseUrl.slice("file:".length).split("?")[0];
  return path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(projectRoot, "prisma", databasePath);
}

function isFreshLocalSqlite(): boolean {
  const databasePath = localSqlitePath();
  return databasePath !== undefined && (!existsSync(databasePath) || statSync(databasePath).size === 0);
}

const freshLocalSqlite = isFreshLocalSqlite();

try {
  runPrisma(["migrate", "deploy"]);
} catch (error) {
  const migrationDirectories = readdirSync(migrationDirectory)
    .filter((entry) => statSync(path.join(migrationDirectory, entry)).isDirectory())
    .sort();

  if (!freshLocalSqlite || migrationDirectories.length !== 1) {
    throw error;
  }

  const migrationName = migrationDirectories[0];
  const migrationSql = readFileSync(
    path.join(migrationDirectory, migrationName, "migration.sql"),
    "utf8",
  );

  console.warn(
    "Prisma migrate deploy could not initialize a fresh local SQLite file; applying the committed initial migration directly for this environment.",
  );
  runPrisma(["db", "execute", "--stdin", "--schema", schemaPath], migrationSql);
  runPrisma(["migrate", "resolve", "--applied", migrationName, "--schema", schemaPath]);
}
