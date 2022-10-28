import axios from "axios";
import { writeFileSync } from "fs";
import { join } from "path";
import prettier from "prettier";
export function updateData() {
  console.log("Downloading data.js");

  axios
    .get<string>("https://adventure.land/data.js")
    .then(function (response) {
      // handle success
      const js = response.data.trim();
      const data = js.substring(6, js.length - 1);
      const json = JSON.parse(data);
      json.timestamp = new Date()
      console.log(`data.js v${json.version} fetched`);

      
      const prettierOptions = { parser: "json" };

      console.log(`data.js formatting`);
      const formatted = prettier.format(JSON.stringify(json), prettierOptions);

      console.log(`data.js writing`);
      // writeFileSync(join(__dirname, "public/data.json"), 
      // formatted, { flag: "w" });
      writeFileSync(join(__dirname, "public/data.json"), 
      formatted);
    })
    .catch(function (error) {
      // handle error
      console.error(error);
    })
    .then(function () {
      // always executed
    });
}

updateData();
// npx ts-node update-data.ts
