import {
  computeMapFocusDistance,
  computeOverviewPose,
  computeWorldBounds,
  mapCenterWorld,
} from "./worldCameraBounds";
import { ParsedMap, WorldLayout } from "./types";

function stubMap(
  id: string,
  artMinX: number,
  artMaxX: number,
  artMinY: number,
  artMaxY: number,
): ParsedMap {
  return {
    id,
    name: id,
    ignore: false,
    outside: true,
    band: "overworld",
    minX: artMinX,
    maxX: artMaxX,
    minY: artMinY,
    maxY: artMaxY,
    artMinX,
    artMaxX,
    artMinY,
    artMaxY,
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

describe("worldCameraControls", () => {
  it("computes bounds from map art and poses", () => {
    const layout: WorldLayout = {
      maps: {
        main: stubMap("main", 0, 100, 0, 80),
        mansion: stubMap("mansion", 0, 60, 0, 40),
      },
      poses: {
        main: { x: 0, y: 0, z: 0 },
        mansion: { x: 10, y: 20, z: 480 },
      },
      connections: [],
    };

    const bounds = computeWorldBounds(layout);
    expect(bounds.minX).toBe(0);
    expect(bounds.maxX).toBe(100);
    expect(bounds.minZ).toBe(0);
    expect(bounds.maxZ).toBe(80);
    expect(bounds.minY).toBe(0);
    expect(bounds.maxY).toBeGreaterThan(480);
    expect(bounds.centerX).toBe(50);
    expect(bounds.centerZ).toBe(40);
  });

  it("places overview camera above world center", () => {
    const bounds = computeWorldBounds({
      maps: { main: stubMap("main", 0, 200, 0, 200) },
      poses: { main: { x: 0, y: 0, z: 0 } },
      connections: [],
    });
    const overview = computeOverviewPose(bounds);
    expect(overview.target.x).toBeCloseTo(100);
    expect(overview.target.z).toBeCloseTo(100);
    expect(overview.position.y).toBeGreaterThan(overview.target.y);
  });

  it("maps map center to world coordinates", () => {
    const map = stubMap("main", 0, 100, 0, 80);
    const center = mapCenterWorld(map, { x: 50, y: 60, z: -240 });
    expect(center.x).toBe(100);
    expect(center.y).toBe(-240);
    expect(center.z).toBe(100);
  });

  it("frames a map footprint for focus zoom", () => {
    const map = stubMap("main", 0, 1000, 0, 600);
    expect(computeMapFocusDistance(map)).toBeCloseTo(1450);
  });
});
