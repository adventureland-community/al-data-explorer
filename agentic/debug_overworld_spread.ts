import { readFileSync } from "fs";
import { collectConnections, layoutWorld } from "../src/WorldViewer/layoutWorld";
import { parseMaps } from "../src/WorldViewer/parseMaps";
import { mapArtRect } from "../src/WorldViewer/rectLayout";

const G = JSON.parse(readFileSync("public/data.json", "utf8"));
const source = { maps: G.maps, geometry: G.geometry };
const maps = parseMaps(source, false, G.npcs);
const connections = collectConnections(maps);
const layout = layoutWorld(source, 480, false, G.npcs);

const overworld = Object.entries(layout.poses)
  .filter(([id]) => layout.maps[id]?.band === "overworld")
  .map(([id, pose]) => ({
    id,
    x: Math.round(pose.x),
    y: Math.round(pose.y),
    z: pose.z,
    w: layout.maps[id].artMaxX - layout.maps[id].artMinX,
    h: layout.maps[id].artMaxY - layout.maps[id].artMinY,
  }))
  .sort((a, b) => a.x - b.x || a.y - b.y);

console.log("overworld maps", overworld.length);
for (const m of overworld) {
  console.log(m.id, `pos=(${m.x},${m.y}) z=${m.z} size=${m.w}x${m.h}`);
}

const main = layout.poses.main;
console.log("\nmain", main);
for (const m of overworld) {
  const dx = m.x - main.x;
  const dy = m.y - main.y;
  console.log(m.id, "delta from main", dx, dy, "angle", (Math.atan2(dy, dx) * 180) / Math.PI);
}

for (const id of ["winterland", "desertland", "goobrawl", "shellsisland", "ship0", "halloween"]) {
  const edges = connections
    .filter((c) => c.fromMap === id || c.toMap === id)
    .map((c) => `${c.fromMap}->${c.toMap}`);
  console.log("\n", id, edges);
}
