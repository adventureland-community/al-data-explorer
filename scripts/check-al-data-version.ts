/**
 * Lightweight data version checker for CI.
 * Fetches data.js only (no art). Opens nothing itself — workflow creates the PR.
 *
 * Exit codes:
 * 0 — no PR needed (same version, or version-only/timestamp-only change)
 * 10 — wrote public/data.json; content changed beyond version/timestamp
 */
import { copyFileSync, readFileSync } from "fs";
import { join } from "path";

import { fetchAdventureLandData, writeDataJson } from "../update-data";
import { dataHasContentChange } from "./summarize-data-diff";

const PUBLIC_DATA = join(__dirname, "..", "public", "data.json");
const BEFORE_COPY = join(__dirname, "..", "public", "data.json.before");

async function main() {
  const committed = JSON.parse(readFileSync(PUBLIC_DATA, "utf8")) as {
    version: number;
    [k: string]: unknown;
  };
  const remote = await fetchAdventureLandData();

  if (remote.version === committed.version) {
    console.log(`version unchanged (${committed.version}); nothing to do`);
    process.exit(0);
  }

  console.log(`version ${committed.version} → ${remote.version}`);
  copyFileSync(PUBLIC_DATA, BEFORE_COPY);
  await writeDataJson(remote);

  if (!dataHasContentChange(committed, remote)) {
    console.log("only version/timestamp changed; discarding write");
    copyFileSync(BEFORE_COPY, PUBLIC_DATA);
    process.exit(0);
  }

  console.log("content changed; public/data.json updated for PR");
  process.exit(10);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
