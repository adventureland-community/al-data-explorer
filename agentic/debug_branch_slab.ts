import { buildDoorLockedSet } from "../src/WorldViewer/doorLayout";
import { isDoorStackPin } from "../src/WorldViewer/layoutGraph";
import { analyzeWorldLayout } from "../src/WorldViewer/layoutAnalysis";
import { layoutWorld } from "../src/WorldViewer/layoutWorld";
import { mapArtRect, resolveSlabOverlaps, DEFAULT_SLAB_GAP } from "../src/WorldViewer/rectLayout";
import { MapSource } from "../src/WorldViewer/types";

const branchSource: MapSource = {
  maps: {
    main: {
      key: "main",
      name: "Town",
      outside: true,
      doors: [[160, 1370, 24, 32, "cave", 0, 4]],
      npcs: [],
      spawns: [[0, 0], [160, 1381]],
    },
    cave: {
      key: "cave",
      name: "Cave",
      doors: [[0, 0, 16, 16, "level1", 0, 0]],
      npcs: [],
      spawns: [[0, 0]],
    },
    level1: {
      key: "level1",
      name: "Level 1",
      doors: [[0, 0, 16, 16, "level2", 0, 0]],
      npcs: [],
      spawns: [[0, 0]],
    },
    level2: {
      key: "level2",
      name: "Level 2",
      doors: [
        [0, 0, 16, 16, "level2n", 0, 0],
        [50, 0, 16, 16, "level2w", 0, 0],
      ],
      npcs: [],
      spawns: [[0, 0], [50, 0]],
    },
    level2n: {
      key: "level2n",
      name: "Level 2N",
      doors: [[0, 0, 16, 16, "level2", 0, 0]],
      npcs: [],
      spawns: [[0, 0]],
    },
    level2w: {
      key: "level2w",
      name: "Level 2W",
      doors: [[0, 0, 16, 16, "level2", 0, 1]],
      npcs: [],
      spawns: [[0, 0]],
    },
  },
  geometry: {
    main: { min_x: 0, max_x: 800, min_y: 0, max_y: 800, tiles: [], placements: [] },
    cave: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
    level1: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
    level2: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
    level2n: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
    level2w: { min_x: 0, max_x: 2000, min_y: 0, max_y: 2000, tiles: [], placements: [] },
  },
};

const layout = layoutWorld(branchSource, 480);
const l2 = layout.maps.level2;
const l2n = layout.maps.level2n;
if (l2 && l2n) {
  console.log("isDoorStackPin(level2, level2n)", isDoorStackPin(l2, l2n));
}
for (const id of ["level2", "level2n", "level2w"]) {
  console.log("after layout", id, layout.poses[id]);
}

const manualPoses = {
  level2: { x: 2400, y: 1370, z: -960 },
  level2n: { x: 2400, y: 1370, z: -960 },
  level2w: { x: 2400, y: 1370, z: -960 },
};
resolveSlabOverlaps(
  layout.maps,
  manualPoses,
  ["level2", "level2n", "level2w"],
  new Set(["level2"]),
  DEFAULT_SLAB_GAP,
);
console.log("after manual slab", manualPoses);
