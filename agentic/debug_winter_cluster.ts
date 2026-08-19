import { readFileSync } from "fs";
import { join } from "path";
import { buildAdjacency, findComponents } from "../src/WorldViewer/layoutGraph";
import { collectConnections, layoutWorld } from "../src/WorldViewer/layoutWorld";
import { parseMaps } from "../src/WorldViewer/parseMaps";

import { MapSource } from "../src/WorldViewer/types";

const G = JSON.parse(readFileSync(join(__dirname, "../public/data.json"), "utf8")) as MapSource & {
  npcs: Record<string, import("typed-adventureland").GNpc>;
};

const source = { maps: G.maps, geometry: G.geometry };
const maps = parseMaps(source, false, G.npcs);
const connections = collectConnections(maps);
const adj = buildAdjacency(connections);
const components = findComponents(Object.keys(maps), adj);

const winterComp = components.find((c) => c.includes("winterland"));
console.log("winter component", winterComp?.sort().join(", "));
console.log("main comp has winter_inn", components.find((c) => c.includes("main"))?.includes("winter_inn"));
console.log("main comp has winterland", components.find((c) => c.includes("main"))?.includes("winterland"));

const layout = layoutWorld(source, 480, false, G.npcs);
for (const id of ["winterland", "winter_inn", "winter_instance", "winter_inn_rooms", "level2n"]) {
  console.log(id, layout.poses[id]);
}

for (const e of connections) {
  if (
    ["winterland", "winter_inn", "winter_instance", "level2n"].includes(e.fromMap) ||
    ["winterland", "winter_inn", "winter_instance", "level2n"].includes(e.toMap)
  ) {
    console.log(`${e.fromMap} -> ${e.toMap} twoWay=${e.twoWay}`);
  }
}
