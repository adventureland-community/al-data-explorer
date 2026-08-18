import { readFileSync } from "fs";
import { collectConnections, layoutWorld } from "../src/WorldViewer/layoutWorld";
import { parseMaps } from "../src/WorldViewer/parseMaps";
import { mapCenterWorld } from "../src/WorldViewer/worldCameraBounds";

const G = JSON.parse(readFileSync("public/data.json", "utf8"));
const source = { maps: G.maps, geometry: G.geometry };
const maps = parseMaps(source, false, G.npcs);
const connections = collectConnections(maps);
const layout = layoutWorld(source, 480, false, G.npcs);

const degree = new Map<string, number>();
for (const id of Object.keys(maps)) {
  degree.set(id, 0);
}
for (const c of connections) {
  degree.set(c.fromMap, (degree.get(c.fromMap) || 0) + 1);
  degree.set(c.toMap, (degree.get(c.toMap) || 0) + 1);
}

const mainCenter = layout.maps.main
  ? mapCenterWorld(layout.maps.main, layout.poses.main!)
  : { x: 0, z: 0 };

const isolated = [...degree.entries()]
  .filter(([, d]) => d === 0)
  .sort(([a], [b]) => a.localeCompare(b));

console.log("isolated maps", isolated.length);
for (const [id] of isolated) {
  const m = layout.maps[id];
  const p = layout.poses[id];
  if (!m || !p) {
    continue;
  }
  const center = mapCenterWorld(m, p);
  const dist = Math.hypot(center.x - mainCenter.x, center.z - mainCenter.z);
  console.log(
    id,
    `band=${m.band}`,
    `pos=(${Math.round(p.x)},${Math.round(p.y)})`,
    `dist=${Math.round(dist)}`,
  );
}
