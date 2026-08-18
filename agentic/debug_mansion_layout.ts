import { readFileSync } from "fs";
import { join } from "path";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
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

for (const id of ["main", "mansion", "tomb", "bank", "tavern"]) {
  const m = layout.maps[id];
  const p = layout.poses[id];
  if (!m || !p) {
    continue;
  }
  console.log(`${id}: band=${m.band} pose=(${Math.round(p.x)}, ${Math.round(p.y)}, z=${p.z})`);
}
