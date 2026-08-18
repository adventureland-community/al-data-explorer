import { readFileSync } from "fs";
import { join } from "path";
import { collectConnections, layoutWorld } from "../src/WorldViewer/layoutWorld";
import { isDoorStackPin } from "../src/WorldViewer/layoutGraph";
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
const st = layout.maps.spookytown;
const hp = layout.poses.halloween;
const sp = layout.poses.spookytown;

console.log("halloween pose", hp);
console.log("spookytown pose", sp);
console.log("doorStackPin", isDoorStackPin(hm, st));

for (const c of layout.connections) {
  if (
    (c.fromMap === "halloween" && c.toMap === "spookytown") ||
    (c.fromMap === "spookytown" && c.toMap === "halloween")
  ) {
    const fp = layout.poses[c.fromMap];
    const tp = layout.poses[c.toMap];
    const from = [fp.x + c.fromX, fp.z, fp.y + c.fromY];
    const to = [tp.x + c.toX, tp.z, tp.y + c.toY];
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const dz = to[2] - from[2];
    console.log("connection", c);
    console.log("world from", from.map(Math.round), "to", to.map(Math.round));
    console.log("delta", [dx, dy, dz].map((v) => Math.round(v)), "len", Math.hypot(dx, dy, dz).toFixed(1));
  }
}

// door-aligned target from BFS formula
const door = hm.doors.find((d) => d.toMap === "spookytown");
if (door && hp) {
  const destSpawn = st.spawns[door.destSpawn];
  const alignedX = hp.x + door.x - destSpawn.x;
  const alignedY = hp.y + door.y - destSpawn.y;
  console.log("expected door-aligned pose", { x: alignedX, y: alignedY, z: hp.z });
  console.log("actual offset from aligned", {
    dx: sp.x - alignedX,
    dy: sp.y - alignedY,
  });
}
