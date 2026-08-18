import { readFileSync } from "fs";
import { join } from "path";
import { analyzeWorldLayout } from "../src/WorldViewer/layoutAnalysis";
import { layoutWorld, pickComponentRoot } from "../src/WorldViewer/layoutWorld";
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

const report = analyzeWorldLayout(layout);

console.log("=== Layout summary ===");
console.log(
  JSON.stringify(
    {
      mapCount: report.mapCount,
      placedCount: report.placedCount,
      connectionCount: report.connectionCount,
      artOverlapsSameZ: report.artOverlapsSameZ,
      artOverlapsAnyZ: report.artOverlapsAnyZ,
      nearOriginCount: report.nearOriginMaps.length,
      exactPoseStacks: report.exactPoseStacks.length,
    },
    null,
    2,
  ),
);

console.log("\n=== Components (hub = BFS root) ===");
for (const component of report.components) {
  const maps = component.mapIds.map((id) => layout.maps[id]);
  const bandCounts = { overworld: 0, indoor: 0, underground: 0 };
  for (const map of maps) {
    bandCounts[map.band] += 1;
  }
  console.log(
    `${component.rootId}: ${component.mapIds.length} maps, depth ${component.maxDepth}, bands ${JSON.stringify(bandCounts)}`,
  );
  console.log(`  maps: ${component.mapIds.join(", ")}`);
}

console.log("\n=== Hub degree within main-sized components ===");
const adjacency = layout.connections;
for (const component of report.components.filter((c) => c.mapIds.length > 1)) {
  const root = pickComponentRoot(component.mapIds, adjacency, layout.maps);
  const degree = new Map<string, number>();
  for (const id of component.mapIds) {
    degree.set(id, 0);
  }
  for (const edge of adjacency) {
    if (degree.has(edge.fromMap)) {
      degree.set(edge.fromMap, (degree.get(edge.fromMap) || 0) + 1);
    }
    if (degree.has(edge.toMap)) {
      degree.set(edge.toMap, (degree.get(edge.toMap) || 0) + 1);
    }
  }
  const ranked = [...degree.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  console.log(`${component.id} root=${root}`);
  for (const [id, count] of ranked) {
    const map = layout.maps[id];
    console.log(`  ${id}: ${count} edges, band=${map.band}, outside=${map.outside}`);
  }
}
