import { readFileSync } from "fs";
import { join } from "path";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { countSameSlabOverlaps } from "../src/WorldViewer/rectLayout";
import { MapSource } from "../src/WorldViewer/types";

const G = JSON.parse(readFileSync(join(__dirname, "../public/data.json"), "utf8")) as {
  maps: MapSource["maps"];
  geometry: MapSource["geometry"];
  npcs: Record<string, unknown>;
};

const layout = layoutWorld(
  { maps: G.maps, geometry: G.geometry },
  480,
  true,
  G.npcs as Record<string, import("typed-adventureland").GNpc>,
);

console.log(`sameZ overlaps: ${countSameSlabOverlaps(layout.maps, layout.poses)}`);

const byZ = new Map<number, string[]>();
for (const [id, pose] of Object.entries(layout.poses)) {
  const list = byZ.get(pose.z) || [];
  list.push(id);
  byZ.set(pose.z, list);
}
for (const [z, ids] of [...byZ.entries()].sort((a, b) => a[0] - b[0])) {
  if (ids.length > 1) {
    console.log(
      `  z=${z}: ${ids.length} maps — ${ids.slice(0, 8).join(", ")}${ids.length > 8 ? "…" : ""}`,
    );
  }
}
