import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const confirmation = "--confirm-reset-local-bookkin";
if (!process.argv.includes(confirmation)) {
  throw new Error(`This command deletes local Bookkin PostgreSQL data. Re-run with ${confirmation} only after verifying no data must be retained.`);
}

function run(command, args) {
  return execFileSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

const containerId = run("docker", ["compose", "ps", "-q", "postgres"]);
if (containerId.length === 0) throw new Error("The Bookkin PostgreSQL container is not running.");

const containerLabels = JSON.parse(run("docker", ["inspect", "--format", "{{json .Config.Labels}}", containerId]));
const expectedWorkingDirectory = projectRoot.toLowerCase();
if (
  path.resolve(containerLabels["com.docker.compose.project.working_dir"] ?? "").toLowerCase() !== expectedWorkingDirectory
  || containerLabels["com.docker.compose.service"] !== "postgres"
  || containerLabels["com.docker.compose.project"] !== "bookkin"
) {
  throw new Error("The resolved PostgreSQL container does not belong to this exact Bookkin checkout and service.");
}

const mounts = JSON.parse(run("docker", ["inspect", "--format", "{{json .Mounts}}", containerId]));
const dataMounts = mounts.filter((mount) => mount.Type === "volume" && mount.Destination === "/var/lib/postgresql");
if (dataMounts.length !== 1 || typeof dataMounts[0].Name !== "string") {
  throw new Error("Exactly one named PostgreSQL data volume must be mounted at /var/lib/postgresql.");
}
const volumeName = dataMounts[0].Name;

const volumeLabels = JSON.parse(run("docker", ["volume", "inspect", "--format", "{{json .Labels}}", volumeName]));
if (
  volumeLabels["com.docker.compose.project"] !== "bookkin"
  || volumeLabels["com.docker.compose.volume"] !== "bookkin-postgres-data"
) {
  throw new Error("The mounted volume does not have the expected Bookkin Compose project and logical-volume labels.");
}

const attachedContainers = run("docker", ["ps", "-a", "-q", "--filter", `volume=${volumeName}`])
  .split(/\r?\n/u)
  .filter(Boolean);
if (attachedContainers.length !== 1 || attachedContainers[0] !== containerId) {
  throw new Error("The Bookkin data volume is attached to an unexpected container; no reset was performed.");
}

run("docker", ["rm", "-f", containerId]);
run("docker", ["volume", "rm", volumeName]);
console.log(`Removed the verified local Bookkin PostgreSQL container and volume ${volumeName}. Run npm run db:up to create an empty database.`);

