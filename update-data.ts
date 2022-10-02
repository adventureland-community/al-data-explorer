import axios from "axios";
import { writeFileSync } from "fs";
import { join } from "path";
export function updateData() {
  axios
    .get<string>("https://adventure.land/data.js")
    .then(function (response) {
      // handle success
      const js = response.data.trim();
      const data = js.substring(6, js.length - 1);
      const json = JSON.parse(data);
      json.timestamp = new Date()

      writeFileSync(join(__dirname, "public/data.json"), JSON.stringify(json), { flag: "w" });
    })
    .catch(function (error) {
      // handle error
      console.log(error);
    })
    .then(function () {
      // always executed
    });
}

updateData();
// npx ts-node update-data.ts
