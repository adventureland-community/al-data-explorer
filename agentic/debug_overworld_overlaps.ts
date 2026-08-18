import { readFileSync } from "fs";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { mapArtRect, rectsOverlap } from "../src/WorldViewer/rectLayout";

const G = JSON.parse(readFileSync("public/data.json", "utf8"));
const layout = layoutWorld({ maps: G.maps, geometry: G.geometry }, 480, false, G.npcs);

const overworld = Object.keys(layout.maps).filter((id) => layout.maps[id].band === "overworld");
console.log("overworld poses");
for (const id of overworld.sort()) {
  const p = layout.poses[id];
  const r = mapArtRect(layout.maps[id], p);
  console.log(
    id,
    `pos=(${Math.round(p.x)},${Math.round(p.y)}) z=${p.z}`,
    `art x:${Math.round(r.minX)}..${Math.round(r.maxX)} y:${Math.round(r.minY)}..${Math.round(r.maxY)}`,
  );
}

console.log("\noverlaps gap 240");
for (let i = 0; i < overworld.length; i += 1) {
  for (let j = i + 1; j < overworld.length; j += 1) {
    const a = overworld[i];
    const b = overworld[j];
    const pa = layout.poses[a];
    const pb = layout.poses[b];
    if (pa.z !== pb.z) {
      continue;
    }
    if (rectsOverlap(mapArtRect(layout.maps[a], pa), mapArtRect(layout.maps[b], pb), 240)) {
      console.log(a, b);
    }
  }
}
