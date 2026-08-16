import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const postgresUser = process.env.BOOKKIN_POSTGRES_USER ?? "bookkin_local";
const sourceDatabase = process.env.BOOKKIN_POSTGRES_DB ?? "bookkin";
const restoreDatabase = process.env.BOOKKIN_RESTORE_DB ?? `${sourceDatabase}_restore_check`;
const allowUnlabeledContainer = process.env.BOOKKIN_ALLOW_UNLABELED_CONTAINER === "true";

const safeIdentifier = /^[a-z][a-z0-9_]{0,62}$/u;
for (const [label, value] of Object.entries({ postgresUser, sourceDatabase, restoreDatabase })) {
  if (!safeIdentifier.test(value)) {
    throw new Error(`${label} must be a simple lowercase PostgreSQL identifier.`);
  }
}
if (!restoreDatabase.endsWith("_restore_check") || restoreDatabase === sourceDatabase) {
  throw new Error("The restore target must be a distinct database ending in _restore_check.");
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
}

const containerId = process.env.BOOKKIN_POSTGRES_CONTAINER
  ?? run("docker", ["compose", "ps", "-q", "postgres"]);
if (containerId.length === 0) {
  throw new Error("No PostgreSQL container was resolved.");
}

const composeWorkingDirectory = run("docker", [
  "inspect",
  "--format",
  "{{ index .Config.Labels \"com.docker.compose.project.working_dir\" }}",
  containerId,
]);
if (!allowUnlabeledContainer && path.resolve(composeWorkingDirectory).toLowerCase() !== projectRoot.toLowerCase()) {
  throw new Error("The PostgreSQL container does not belong to this exact Bookkin checkout.");
}

function postgres(args) {
  return run("docker", ["exec", containerId, ...args]);
}

function query(database, sql) {
  return postgres(["psql", "-U", postgresUser, "-d", database, "-Atc", sql]);
}

function databaseFingerprint(database) {
  const tableNames = query(
    database,
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;",
  ).split(/\r?\n/u).filter(Boolean);

  const countUnion = tableNames.map((tableName) => {
    const quotedName = `"${tableName.replaceAll('"', '""')}"`;
    const literalName = tableName.replaceAll("'", "''");
    return `SELECT '${literalName}' AS table_name, COUNT(*)::bigint AS row_count FROM public.${quotedName}`;
  }).join(" UNION ALL ");
  const tableCounts = JSON.parse(query(
    database,
    `SELECT jsonb_object_agg(table_name, row_count ORDER BY table_name)::text FROM (${countUnion}) AS counts;`,
  ));

  const constraints = query(
    database,
    "SELECT conname || ':' || contype::text FROM pg_constraint WHERE connamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public') ORDER BY conname;",
  ).split(/\r?\n/u).filter(Boolean);

  return { tableCounts, constraints };
}

const existingRestore = postgres([
  "psql",
  "-U",
  postgresUser,
  "-d",
  sourceDatabase,
  "-Atc",
  `SELECT 1 FROM pg_database WHERE datname = '${restoreDatabase}';`,
]);
if (existingRestore === "1") {
  throw new Error(`Refusing to reuse existing database ${restoreDatabase}.`);
}

const dumpPath = `/tmp/${sourceDatabase}-restore-rehearsal.dump`;
let restoreCreated = false;
let operationError;

try {
  postgres(["pg_dump", "-U", postgresUser, "-d", sourceDatabase, "-Fc", "-f", dumpPath]);
  const checksum = postgres(["sha256sum", dumpPath]).split(/\s+/u)[0];

  postgres(["createdb", "-U", postgresUser, restoreDatabase]);
  restoreCreated = true;
  postgres(["pg_restore", "-U", postgresUser, "-d", restoreDatabase, "--exit-on-error", dumpPath]);

  const source = databaseFingerprint(sourceDatabase);
  const restored = databaseFingerprint(restoreDatabase);
  if (JSON.stringify(source) !== JSON.stringify(restored)) {
    throw new Error("Restored table counts or constraint inventory differ from the source database.");
  }

  const evidence = {
    checkedAt: new Date().toISOString(),
    sourceDatabase,
    restoreDatabase,
    dumpSha256: checksum,
    tableCounts: source.tableCounts,
    constraintCount: source.constraints.length,
  };
  const evidenceDirectory = path.join(projectRoot, ".local-backups");
  mkdirSync(evidenceDirectory, { recursive: true });
  writeFileSync(
    path.join(evidenceDirectory, "postgres-restore-rehearsal.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
    "utf8",
  );
  console.log(`Backup/restore rehearsal passed for ${Object.keys(source.tableCounts).length} tables and ${source.constraints.length} constraints.`);
  console.log(`Dump SHA-256: ${checksum}`);
} catch (error) {
  operationError = error;
}

const cleanupErrors = [];
if (restoreCreated) {
  try {
    postgres(["dropdb", "-U", postgresUser, restoreDatabase]);
  } catch (error) {
    cleanupErrors.push(new Error(`Could not delete disposable restore database ${restoreDatabase}.`, { cause: error }));
  }
}
try {
  postgres(["rm", "-f", dumpPath]);
} catch (error) {
  cleanupErrors.push(new Error(`Could not delete temporary dump ${dumpPath}.`, { cause: error }));
}

if (operationError !== undefined) {
  if (cleanupErrors.length > 0) {
    console.error(`The rehearsal failed and ${cleanupErrors.length} cleanup operation(s) also failed.`);
    for (const cleanupError of cleanupErrors) console.error(cleanupError.message);
  }
  throw operationError;
}
if (cleanupErrors.length > 0) {
  throw new AggregateError(cleanupErrors, "The restore rehearsal passed, but cleanup did not complete.");
}
