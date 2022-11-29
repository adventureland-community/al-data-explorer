import axios from "axios";
import { writeFileSync } from "fs";
import { join } from "path";
import prettier from "prettier";

export async function updateData() {
  console.log("Downloading data.js");
  const { data } = await axios.get<string>("https://adventure.land/data.js");
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
  writeFileSync(join(__dirname, "public/data.json"), formatted);
}

updateData().catch(console.error);
