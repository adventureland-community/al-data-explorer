import axios from "axios";
import { mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import prettier from "prettier";
import { collectArtAssets } from "./src/WorldViewer/adventureLandAssetUrl";

const PUBLIC_DIR = join(__dirname, "public");
const AL_ORIGIN = "https://adventure.land";

export async function updateData() {
  console.log("Downloading data.js");
  const { data } = await axios.get<string>(`${AL_ORIGIN}/data.js`);
  const js = data.trim();
  const json = JSON.parse(js.substring(6, js.length - 1));
  json.timestamp = new Date();
  console.log(`data.js v${json.version} fetched`);

  console.log(`data.js formatting`);
  const prettierOptions = {
    parser: "json",
  };
  const formatted = prettier.format(JSON.stringify(json), prettierOptions);

  console.log(`data.js writing`);
  writeFileSync(join(PUBLIC_DIR, "data.json"), formatted);

  const assets = collectArtAssets(json);
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

updateData().catch(console.error);
