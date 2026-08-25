import axios from "axios";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import prettier from "prettier";
import { collectArtAssets } from "./src/WorldViewer/adventureLandAssetUrl";

const PUBLIC_DIR = join(__dirname, "public");
const AL_ORIGIN = "https://adventure.land";

export type AdventureLandData = Record<string, unknown> & {
  version: number;
  timestamp?: string | Date;
};

/** Fetch and parse adventure.land/data.js (no art downloads). */
export async function fetchAdventureLandData(): Promise<AdventureLandData> {
  console.log("Downloading data.js");
  const { data } = await axios.get<string>(`${AL_ORIGIN}/data.js`);
  const js = data.trim();
  const json = JSON.parse(js.substring(6, js.length - 1)) as AdventureLandData;
  json.timestamp = new Date();
  console.log(`data.js v${json.version} fetched`);
  return json;
}

/** Write public/data.json only (prettier-formatted). */
export async function writeDataJson(json: AdventureLandData): Promise<string> {
  console.log(`data.js formatting`);
  const prettierOptions = { parser: "json" as const };
  const formatted = prettier.format(JSON.stringify(json), prettierOptions);
  const path = join(PUBLIC_DIR, "data.json");
  console.log(`data.js writing`);
  writeFileSync(path, formatted);
  return path;
}

export async function downloadArtAssets(json: AdventureLandData): Promise<void> {
  const assets = collectArtAssets(json as Parameters<typeof collectArtAssets>[0]);
  console.log(`Downloading ${assets.length} map/sprite images`);
  const concurrency = 8;
  let next = 0;
  const workers: Promise<void>[] = [];
  const downloadNext = async () => {
    while (next < assets.length) {
      const index = next;
      next += 1;
      const asset = assets[index];
      const dest = join(PUBLIC_DIR, asset.path.replace(/^\//, ""));
      mkdirSync(dirname(dest), { recursive: true });
      const url = `${AL_ORIGIN}${asset.remotePath}`;
      process.stdout.write(`  ${asset.path}\n`);
      const response = await axios.get<ArrayBuffer>(url, { responseType: "arraybuffer" });
      writeFileSync(dest, Buffer.from(response.data));
    }
  };
  const workerCount = Math.min(concurrency, assets.length);
  for (let i = 0; i < workerCount; i += 1) {
    workers.push(downloadNext());
  }
  await Promise.all(workers);
}

export async function updateData() {
  const json = await fetchAdventureLandData();
  await writeDataJson(json);
  await downloadArtAssets(json);
}

if (typeof require !== "undefined" && require.main === module) {
  updateData().catch(console.error);
}
