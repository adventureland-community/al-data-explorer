import { readFileSync } from "fs";
import { join } from "path";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { countSameSlabOverlaps, mapArtRect, rectsOverlap } from "../src/WorldViewer/rectLayout";
import { MapSource } from "../src/WorldViewer/types";

const G = JSON.parse(readFileSync(join(__dirname, "../public/data.json"), "utf8")) as {
  maps: MapSource["maps"];
  geometry: MapSource["geometry"];
  npcs: Record<string, unknown>;
};

const layout = layoutWorld(
  { maps: G.maps, geometry: G.geometry },
  480,
  false,
  G.npcs as Record<string, import("typed-adventureland").GNpc>,
);

const hm = layout.maps.halloween;
const hp = layout.poses.halloween;
const st = layout.maps.spookytown;
const sp = layout.poses.spookytown;
console.log("halloween/spookytown art overlap (gap 0)", rectsOverlap(mapArtRect(hm, hp), mapArtRect(st, sp), 0));
console.log("halloween/spookytown art overlap (gap 240)", rectsOverlap(mapArtRect(hm, hp), mapArtRect(st, sp), 240));
console.log("same-z overlaps gap 240:", countSameSlabOverlaps(layout.maps, layout.poses, 240));
console.log("same-z overlaps gap 0:", countSameSlabOverlaps(layout.maps, layout.poses, 0));

const edge = layout.connections.find((c) => c.fromMap === "halloween" && c.toMap === "spookytown");
if (edge && hp && sp) {
  console.log(
    "door delta",
    hp.x + edge.fromX - (sp.x + edge.toX),
    hp.y + edge.fromY - (sp.y + edge.toY),
  );
}
