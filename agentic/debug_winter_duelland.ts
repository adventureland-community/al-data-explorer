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

const ids = [
  "main",
  "duelland",
  "winterland",
  "winter_inn",
  "winter_inn_rooms",
  "winter_cave",
  "winter_cove",
  "level2n",
];

for (const id of ids) {
  const m = layout.maps[id];
  const p = layout.poses[id];
  if (!m || !p) {
    console.log(`${id}: MISSING`);
    continue;
  }
  const r = mapArtRect(m, p);
  console.log(
    `${id}: band=${m.band} pose=(${Math.round(p.x)}, ${Math.round(p.y)}, z=${p.z}) art=[${Math.round(r.minX)},${Math.round(r.minY)}]-[${Math.round(r.maxX)},${Math.round(r.maxY)}]`,
  );
}
