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

const overworldIds = Object.keys(layout.maps).filter((id) => layout.maps[id].band === "overworld");
console.log("=== Overworld map poses ===");
for (const id of overworldIds.sort()) {
  const p = layout.poses[id];
  console.log(`${id}: (${Math.round(p.x)}, ${Math.round(p.y)}, z=${p.z})`);
}

console.log("\n=== Doors from main to other overworlds ===");
for (const door of layout.maps.main?.doors || []) {
  const target = layout.maps[door.toMap];
  if (target?.band === "overworld" || ["winterland", "desertland", "halloween"].includes(door.toMap)) {
    const p = layout.poses[door.toMap];
    console.log(
      `main door (${door.x}, ${door.y}) -> ${door.toMap} spawn ${door.destSpawn} pose (${Math.round(p?.x || 0)}, ${Math.round(p?.y || 0)})`,
    );
  }
}

console.log("\n=== Dungeon level chain ===");
for (const id of ["level1", "level2", "level3", "level4"]) {
  const p = layout.poses[id];
  if (p) {
    console.log(`${id}: z=${p.z} (${Math.round(p.x)}, ${Math.round(p.y)})`);
  }
}

console.log("\n=== Door alignment check ===");
function checkEdge(a: string, b: string) {
  const edge = layout.connections.find(
    (c) => (c.fromMap === a && c.toMap === b) || (c.fromMap === b && c.toMap === a),
  );
  if (!edge) {
    console.log(`no edge ${a} <-> ${b}`);
    return;
  }
  const fromPose = layout.poses[edge.fromMap];
  const toPose = layout.poses[edge.toMap];
  const dx = toPose.x + edge.toX - (fromPose.x + edge.fromX);
  const dy = toPose.y + edge.toY - (fromPose.y + edge.fromY);
  console.log(`${a} <-> ${b}: alignment error (${dx.toFixed(2)}, ${dy.toFixed(2)})`);
}
checkEdge("main", "halloween");
checkEdge("level2n", "winterland");
checkEdge("level2s", "desertland");
checkEdge("main", "mansion");
checkEdge("level1", "level2");
