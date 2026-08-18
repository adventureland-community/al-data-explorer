import { PortalRigidGroups } from "./doorLayout";
import {
  COMPONENT_PACK_GAP,
  componentArtBounds,
  packComponentOnShelf,
  PackShelf,
} from "./overworldLayout";
import { ParsedMap, MapPose } from "./types";

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

describe("overworldLayout", () => {
  it("wraps disconnected components onto multiple shelf rows", () => {
    const shelf: PackShelf = { cursorX: 0, cursorY: 5000, rowHeight: 0 };
    const maps = {
      a: stubMap("a", 18000, 1000),
      b: stubMap("b", 18000, 1000),
      c: stubMap("c", 18000, 1000),
    };
    const poses: Record<string, MapPose> = {
      a: { x: 0, y: 0, z: 0 },
      b: { x: 0, y: 0, z: 0 },
      c: { x: 0, y: 0, z: 0 },
    };

    const shiftA = packComponentOnShelf(shelf, componentArtBounds(maps, poses, ["a"]));
    poses.a.x += shiftA.dx;
    poses.a.y += shiftA.dy;

    const shiftB = packComponentOnShelf(shelf, componentArtBounds(maps, poses, ["b"]));
    poses.b.x += shiftB.dx;
    poses.b.y += shiftB.dy;

    const shiftC = packComponentOnShelf(shelf, componentArtBounds(maps, poses, ["c"]));
    poses.c.x += shiftC.dx;
    poses.c.y += shiftC.dy;

    expect(poses.a.y).toBe(5000);
    expect(poses.b.y).toBe(5000);
    expect(poses.c.y).toBeGreaterThan(5000 + 1000 + COMPONENT_PACK_GAP - 1);
  });
});
