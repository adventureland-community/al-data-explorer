import { readFileSync } from "fs";
import { join } from "path";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { MapSource } from "../src/WorldViewer/types";
import { mapArtRect } from "../src/WorldViewer/rectLayout";

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

const ids = Object.keys(layout.poses);
for (let i = 0; i < ids.length; i += 1) {
  for (let j = i + 1; j < ids.length; j += 1) {
    const a = ids[i];
    const b = ids[j];
    const poseA = layout.poses[a];
    const poseB = layout.poses[b];
    if (poseA.z !== poseB.z) {
      continue;
    }
    const rectA = mapArtRect(layout.maps[a], poseA);
    const rectB = mapArtRect(layout.maps[b], poseB);
    const overlap =
      rectA.minX < rectB.maxX &&
      rectB.minX < rectA.maxX &&
      rectA.minY < rectB.maxY &&
      rectB.minY < rectA.maxY;
    if (overlap) {
      console.log(`overlap z=${poseA.z}: ${a} vs ${b}`);
    }
  }
}
