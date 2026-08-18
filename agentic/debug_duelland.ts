import { readFileSync } from "fs";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { mapArtRect, rectsOverlap } from "../src/WorldViewer/rectLayout";

const G = JSON.parse(readFileSync("public/data.json", "utf8"));
const layout = layoutWorld({ maps: G.maps, geometry: G.geometry }, 480, false, G.npcs);

const instanceIds = Object.entries(G.maps)
  .filter(([, m]) => (m as { instance?: boolean }).instance)
  .map(([id]) => id);

console.log("instance maps in G", instanceIds);

for (const id of ["duelland", "arena", "goobrawl", "winter_instance", "abtesting", "jail"]) {
  const m = layout.maps[id];
  const p = layout.poses[id];
  const g = G.maps[id] as
    | { instance?: boolean; outside?: boolean; irregular?: boolean; doors?: unknown[] }
    | undefined;
  console.log(
    "\n",
    id,
    "parsed",
    m ? `band=${m.band} outside=${m.outside}` : "MISSING",
    "g",
    g ? `instance=${g.instance} outside=${g.outside} irregular=${g.irregular}` : "no G",
    "pose",
    p,
  );
  if (m && p) {
    const r = mapArtRect(m, p);
    console.log(" art", r, "size", r.maxX - r.minX, r.maxY - r.minY);
    const mainR = mapArtRect(layout.maps.main, layout.poses.main);
    console.log(
      " overlap main gap0",
      rectsOverlap(r, mainR, 0),
      "gap240",
      rectsOverlap(r, mainR, 240),
      "sameZ",
      p.z === layout.poses.main.z,
    );
  }
  const edges = layout.connections.filter((c) => c.fromMap === id || c.toMap === id);
  for (const e of edges) {
    console.log(" edge", e);
  }
}

const indoorOnMainZ = Object.entries(layout.poses).filter(([id, p]) => {
  const m = layout.maps[id];
  return m && m.band === "indoor" && p.z === layout.poses.main.z;
});
console.log(
  "\nindoor maps on main Z",
  indoorOnMainZ.map(([id, p]) => `${id} z=${p.z}`),
);
