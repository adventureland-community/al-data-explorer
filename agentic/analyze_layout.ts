import { readFileSync } from "fs";
import { join } from "path";
import {
  buildAdjacency,
  doorGraphDepth,
  findComponents,
  pickComponentRoot,
} from "../src/WorldViewer/layoutGraph";
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

const mapIds = Object.keys(layout.maps);
const adj = buildAdjacency(layout.connections);
const components = findComponents(mapIds, adj);

console.log("=== Layout summary ===");
console.log(
  JSON.stringify(
    {
      mapCount: mapIds.length,
      placedCount: Object.keys(layout.poses).length,
      connectionCount: layout.connections.length,
      sameSlabOverlaps: countSameSlabOverlaps(layout.maps, layout.poses),
    },
    null,
    2,
  ),
);

console.log("\n=== Components (hub = BFS root) ===");
for (const mapIdsInComponent of components) {
  const rootId = pickComponentRoot(mapIdsInComponent, layout.connections, layout.maps);
  const maps = mapIdsInComponent.map((id) => layout.maps[id]);
  const bandCounts = { overworld: 0, indoor: 0, underground: 0 };
  for (const map of maps) {
    bandCounts[map.band] += 1;
  }
  const maxDepth = doorGraphDepth(rootId, mapIdsInComponent, layout.connections);
  console.log(
    `${rootId}: ${mapIdsInComponent.length} maps, depth ${maxDepth}, bands ${JSON.stringify(
      bandCounts,
    )}`,
  );
  console.log(`  maps: ${mapIdsInComponent.join(", ")}`);
}

console.log("\n=== Hub degree within main-sized components ===");
for (const mapIdsInComponent of components.filter((component) => component.length > 1)) {
  const root = pickComponentRoot(mapIdsInComponent, layout.connections, layout.maps);
  const degree = new Map<string, number>();
  for (const id of mapIdsInComponent) {
    degree.set(id, 0);
  }
  for (const edge of layout.connections) {
    if (degree.has(edge.fromMap)) {
      degree.set(edge.fromMap, (degree.get(edge.fromMap) || 0) + 1);
    }
    if (degree.has(edge.toMap)) {
      degree.set(edge.toMap, (degree.get(edge.toMap) || 0) + 1);
    }
  }
  const ranked = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`root=${root}`);
  for (const [id, count] of ranked) {
    const map = layout.maps[id];
    console.log(`  ${id}: ${count} edges, band=${map.band}, outside=${map.outside}`);
  }
}
