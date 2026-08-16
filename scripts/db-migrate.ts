import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import "dotenv/config";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaCommand = process.execPath;
const prismaCliPath = path.join(projectRoot, "node_modules", "prisma", "build", "index.js");
const schemaPath = "prisma/schema.prisma";

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

const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || !/^postgres(?:ql)?:\/\//u.test(databaseUrl)) {
  throw new Error("DATABASE_URL must be an explicit PostgreSQL URL before migrations run.");
}

runPrisma(["migrate", "deploy", "--schema", schemaPath]);
