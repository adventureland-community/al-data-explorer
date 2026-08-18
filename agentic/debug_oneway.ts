import { readFileSync } from "fs";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";

const G = JSON.parse(readFileSync("public/data.json", "utf8"));
const layout = layoutWorld({ maps: G.maps, geometry: G.geometry }, 480, false, G.npcs);

const oneWay = layout.connections.filter((c) => !c.twoWay);
console.log("one-way count", oneWay.length);
for (const e of oneWay.sort((a, b) => a.fromMap.localeCompare(b.fromMap))) {
  const from = layout.maps[e.fromMap];
  const to = layout.maps[e.toMap];
  console.log(
    `${e.fromMap}(${from?.band}) -> ${e.toMap}(${to?.band})`,
    `instance=${Boolean((G.maps[e.fromMap] as { instance?: boolean })?.instance)}`,
  );
}
