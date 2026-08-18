import { ParsedMap } from "./types";
import {
  countSameSlabOverlaps,
  DEFAULT_SLAB_GAP,
  mapArtRect,
  resolveDoorLockedSlabOverflow,
  resolveSlabOverlaps,
  resolveWorldSlabs,
  separationPush,
} from "./rectLayout";

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

describe("rectLayout", () => {
  it("detects overlap from art bounds", () => {
    const mapA = stubMap("a", 1000, 1000);
    const mapB = stubMap("b", 1000, 1000);
    const push = separationPush(mapA, { x: 0, y: 0, z: 0 }, mapB, { x: 500, y: 0, z: 0 }, 0);
    expect(push).not.toBeNull();
    expect(Math.abs(push?.dx || 0)).toBeGreaterThan(0);
  });

  it("separates overlapping maps on a slab using their sizes", () => {
    const maps = { a: stubMap("a", 1000, 800), b: stubMap("b", 1000, 800) };
    const poses = {
      a: { x: 0, y: 0, z: 0 },
      b: { x: 200, y: 100, z: 0 },
    };
    resolveSlabOverlaps(maps, poses, ["a", "b"], new Set(["a"]), DEFAULT_SLAB_GAP);
    expect(countSameSlabOverlaps(maps, poses)).toBe(0);
    const aRect = mapArtRect(maps.a, poses.a);
    const bRect = mapArtRect(maps.b, poses.b);
    const separated =
      bRect.minX >= aRect.maxX ||
      aRect.minX >= bRect.maxX ||
      bRect.minY >= aRect.maxY ||
      aRect.minY >= bRect.maxY;
    expect(separated).toBe(true);
  });

  it("separates movable map off a port-locked anchor on any Z slab", () => {
    const maps = { a: stubMap("a", 2000, 2000), b: stubMap("b", 2000, 2000) };
    const poses = {
      a: { x: 0, y: 0, z: -960 },
      b: { x: 0, y: 0, z: -960 },
    };
    resolveSlabOverlaps(maps, poses, ["a", "b"], new Set(["a"]), DEFAULT_SLAB_GAP);
    expect(poses.b.x).not.toBe(0);
    expect(countSameSlabOverlaps(maps, poses)).toBe(0);
  });

  it("bumps overlapping door-locked indoor maps by the slab gap", () => {
    const maps = { bank: stubMap("bank", 400, 500), mansion: stubMap("mansion", 800, 700) };
    maps.bank.band = "indoor";
    maps.mansion.band = "indoor";
    const poses = {
      bank: { x: 0, y: 0, z: 480 },
      mansion: { x: 200, y: 400, z: 480 },
    };
    resolveDoorLockedSlabOverflow(maps, poses, new Set(["bank", "mansion"]));
    expect(poses.bank.z).not.toBe(poses.mansion.z);
    expect(countSameSlabOverlaps(maps, poses, DEFAULT_SLAB_GAP)).toBe(0);
  });

  it("does not z-bump overworld maps that can still separate in XY", () => {
    const maps = { forest: stubMap("forest", 400, 400), town: stubMap("town", 400, 400) };
    const poses = {
      forest: { x: 0, y: 0, z: 0 },
      town: { x: 200, y: 0, z: 0 },
    };
    resolveDoorLockedSlabOverflow(maps, poses, new Set(["forest", "town"]));
    expect(poses.forest.z).toBe(0);
    expect(poses.town.z).toBe(0);
  });

  it("reports whether a slab pass moved maps", () => {
    const maps = { a: stubMap("a", 400, 400), b: stubMap("b", 400, 400) };
    const overlapping = {
      a: { x: 0, y: 0, z: 0 },
      b: { x: 50, y: 0, z: 0 },
    };
    expect(resolveWorldSlabs(maps, overlapping, new Set(["a"]))).toBe(true);
    expect(resolveWorldSlabs(maps, overlapping, new Set(["a"]))).toBe(false);
  });
});
