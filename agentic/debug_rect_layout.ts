import {
  countSameSlabOverlaps,
  DEFAULT_SLAB_GAP,
  mapArtRect,
  resolveSlabOverlaps,
} from "../src/WorldViewer/rectLayout";
import { ParsedMap } from "../src/WorldViewer/types";

function stubMap(id: string, w: number, h: number): ParsedMap {
  return {
    id,
    name: id,
    ignore: false,
    outside: true,
    band: "overworld",
    minX: 0,
    maxX: w,
    minY: 0,
    maxY: h,
    artMinX: 0,
    artMaxX: w,
    artMinY: 0,
    artMaxY: h,
    xLines: [],
    yLines: [],
    doors: [],
    spawns: [],
    quirks: [],
    npcs: [],
    monsters: [],
    zones: [],
  };
}

const maps = { a: stubMap("a", 1000, 800), b: stubMap("b", 1000, 800) };
const poses = {
  a: { x: 0, y: 0, z: 0 },
  b: { x: 200, y: 100, z: 0 },
};
resolveSlabOverlaps(maps, poses, ["a", "b"], new Set(["a"]), DEFAULT_SLAB_GAP);
console.log("b pose", poses.b);
console.log("overlaps", countSameSlabOverlaps(maps, poses));
const aRect = mapArtRect(maps.a, poses.a);
const bRect = mapArtRect(maps.b, poses.b);
console.log("gap check", bRect.minX, ">=", aRect.maxX + DEFAULT_SLAB_GAP);
