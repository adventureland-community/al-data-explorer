import { readFileSync } from "fs";
import { collectConnections, layoutWorld } from "../src/WorldViewer/layoutWorld";
import { mapArtRect, rectsOverlap } from "../src/WorldViewer/rectLayout";

const G = JSON.parse(readFileSync("public/data.json", "utf8"));
const layout = layoutWorld({ maps: G.maps, geometry: G.geometry }, 480, false, G.npcs);

for (const id of ["main", "halloween", "spookytown"]) {
  const p = layout.poses[id];
  const m = layout.maps[id];
  console.log(id, p, "art", mapArtRect(m, p));
}

const mp = layout.poses.main;
const hp = layout.poses.halloween;
const sp = layout.poses.spookytown;
const hm = layout.maps.main;
const hh = layout.maps.halloween;
if (mp && hp && hm && hh) {
  console.log(
    "main/halloween overlap gap240",
    rectsOverlap(mapArtRect(hm, mp), mapArtRect(hh, hp), 240),
  );
}

const edge = layout.connections.find((c) => c.fromMap === "halloween" && c.toMap === "spookytown");
if (edge && hp && sp) {
  const ax = hp.x + edge.fromX;
  const ay = hp.y + edge.fromY;
  const bx = sp.x + edge.toX;
  const by = sp.y + edge.toY;
  console.log("door halloween", ax, ay, "door spookytown", bx, by, "dist", Math.hypot(bx - ax, by - ay));
}

const mainEdge = layout.connections.find((c) => c.fromMap === "main" && c.toMap === "halloween");
if (mainEdge && mp && hp) {
  const ax = mp.x + mainEdge.fromX;
  const ay = mp.y + mainEdge.fromY;
  const bx = hp.x + mainEdge.toX;
  const by = hp.y + mainEdge.toY;
  console.log("door main", ax, ay, "spawn halloween", bx, by, "dist", Math.hypot(bx - ax, by - ay));
}
