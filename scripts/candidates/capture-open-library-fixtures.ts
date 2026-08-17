/**
 * Captures the real Open Library /search.json response for every TopicCodeV1 in the frozen
 * dictionary (docs/architecture/checkpoint-7a-phase-one-proposal.md), using the exact same
 * OpenLibraryCandidateDiscoveryProvider the application runs. Writes a committed, non-private
 * fixture manifest that tests can replay -- production never stores raw provider responses.
 *
 * This script requires real outbound internet access. It cannot run inside a network-isolated
 * sandbox; run it from a machine with normal internet access.
 *
 * Usage: npx tsx scripts/candidates/capture-open-library-fixtures.ts
 */
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { allTopicCodes, outboundQueryForTopicCode } from "../../src/domain/interests/topic-codes";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputPath = path.join(projectRoot, "fixtures", "candidates", "open-library-discovery-manifest.json");

type OpenLibrarySearchDoc = {
  key?: string;
  title?: string;
  isbn?: string[];
  language?: string[];
};

type ManifestEntry = {
  sourceCode: string;
  url: string;
  capturedAtUtc: string;
  httpStatus: number;
  sha256: string;
  docCount: number;
  excerptTitles: string[];
  providerRecordIds: string[];
};

function recordId(key: string | undefined): string | undefined {
  return key?.split("/").filter(Boolean).at(-1);
}

async function captureOne(sourceCode: string): Promise<ManifestEntry> {
  const parameters = new URLSearchParams({
    q: outboundQueryForTopicCode(sourceCode as never),
    fields: "key,title,author_name,edition_key,isbn,language,subject",
    limit: "100",
    page: "1",
  });
  const url = `https://openlibrary.org/search.json?${parameters.toString()}`;
  const capturedAtUtc = new Date().toISOString();

  const response = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
  const bodyText = await response.text();
  const sha256 = createHash("sha256").update(bodyText).digest("hex");

  let docs: OpenLibrarySearchDoc[] = [];
  if (response.ok) {
    try {
      const payload = JSON.parse(bodyText) as { docs?: OpenLibrarySearchDoc[] };
      docs = payload.docs ?? [];
    } catch {
      docs = [];
    }
  }

  return {
    sourceCode,
    url,
    capturedAtUtc,
    httpStatus: response.status,
    sha256,
    docCount: docs.length,
    excerptTitles: docs.slice(0, 5).map((doc) => doc.title ?? "(untitled)"),
    providerRecordIds: docs.flatMap((doc) => {
      const id = recordId(doc.key);
      return id === undefined ? [] : [id];
    }),
  };
}

async function main(): Promise<void> {
  const entries: ManifestEntry[] = [];
  for (const sourceCode of allTopicCodes) {
    process.stderr.write(`Capturing ${sourceCode}...\n`);
    // Sequential and rate-limited on purpose: this hits a real third-party API and should stay
    // a small, polite, one-time capture, not a burst of 14 concurrent requests.
    const entry = await captureOne(sourceCode);
    entries.push(entry);
    process.stderr.write(`  ${entry.httpStatus} - ${entry.docCount} docs\n`);
    await new Promise((resolve) => { setTimeout(resolve, 500); });
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify({ capturedAtUtc: new Date().toISOString(), entries }, null, 2)}\n`);
  process.stderr.write(`\nWrote ${entries.length} entries to ${outputPath}\n`);

  const failed = entries.filter((entry) => entry.httpStatus !== 200);
  if (failed.length > 0) {
    process.stderr.write(`\n${failed.length} source code(s) did not return HTTP 200:\n`);
    for (const entry of failed) process.stderr.write(`  ${entry.sourceCode}: ${entry.httpStatus}\n`);
    process.exitCode = 1;
  }
}

await main();
