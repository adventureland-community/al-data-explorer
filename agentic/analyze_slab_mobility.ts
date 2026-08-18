import { readFileSync } from "fs";
import { join } from "path";
import { buildDoorLockedSet } from "../src/WorldViewer/doorLayout";
import { isDoorStackPin } from "../src/WorldViewer/layoutGraph";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { countSameSlabOverlaps } from "../src/WorldViewer/rectLayout";
import { MapSource } from "../src/WorldViewer/types";

const G = JSON.parse(readFileSync(join(__dirname, "../public/data.json"), "utf8")) as {
  maps: MapSource["maps"];
  geometry: MapSource["geometry"];
  npcs: Record<string, unknown>;
};

// Simulate doorAligned like BFS would — all underground children currently locked
const layout = layoutWorld(
  { maps: G.maps, geometry: G.geometry },
  480,
  false,
  G.npcs as Record<string, import("typed-adventureland").GNpc>,
);

console.log("sameZ overlaps total:", countSameSlabOverlaps(layout.maps, layout.poses));

const byZ = new Map<number, string[]>();
for (const [id, pose] of Object.entries(layout.poses)) {
  const list = byZ.get(pose.z) || [];
  list.push(id);
  byZ.set(pose.z, list);
}

for (const [z, ids] of [...byZ.entries()].sort((a, b) => a[0] - b[0])) {
  if (ids.length < 2) continue;
  const overlaps = countSameSlabOverlaps(layout.maps, layout.poses);
  console.log(`\nz=${z}: ${ids.length} maps, slab overlaps (global count includes all z)`);
  console.log(" ", ids.slice(0, 10).join(", "), ids.length > 10 ? "…" : "");
}

// Check level2 branches
for (const pair of [
  ["level2", "level2n"],
  ["level2", "level2w"],
  ["level1", "level2"],
] as const) {
  const a = layout.maps[pair[0]];
  const b = layout.maps[pair[1]];
  if (a && b) {
    console.log(`isDoorStackPin(${pair[0]}, ${pair[1]}):`, isDoorStackPin(a, b));
  }
}
