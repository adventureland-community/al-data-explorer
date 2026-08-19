import * as THREE from "three";
import {
  computeMapFocusDistance,
  computeOverviewPose,
  computeTopDownPose,
  computeWorldBounds,
  computeWorldFocusPose,
  mapCenterWorld,
} from "./worldCameraBounds";
import { panDeltaFromScreen } from "./worldCameraPan";
import { stubParsedMap } from "./parsedMapStub";
import { ParsedMap, WorldLayout } from "./types";

function stubMap(
  id: string,
  artMinX: number,
  artMaxX: number,
  artMinY: number,
  artMaxY: number,
): ParsedMap {
  return stubParsedMap(id, {
    minX: artMinX,
    maxX: artMaxX,
    minY: artMinY,
    maxY: artMaxY,
    artMinX,
    artMaxX,
    artMinY,
    artMaxY,
  });
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

  it("places map-mode camera straight above the map", () => {
    const bounds = computeWorldBounds({
      maps: { main: stubMap("main", 0, 200, 0, 200) },
      poses: { main: { x: 0, y: 0, z: 0 } },
      connections: [],
    });
    const topDown = computeTopDownPose(bounds);
    expect(topDown.target.x).toBeCloseTo(100);
    expect(topDown.target.z).toBeCloseTo(100);
    expect(topDown.position.x).toBeCloseTo(topDown.target.x);
    expect(topDown.position.z).toBeCloseTo(topDown.target.z);
    expect(topDown.position.y).toBeGreaterThan(topDown.target.y);
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

  it("uses an axis-aligned 45° view for map focus", () => {
    const map = stubMap("main", 0, 1000, 0, 600);
    const focus = computeWorldFocusPose(map, { x: 100, y: 200, z: 480 });
    expect(focus.target.x).toBeCloseTo(600);
    expect(focus.target.y).toBe(480);
    expect(focus.target.z).toBeCloseTo(500);
    expect(focus.position.x).toBeCloseTo(focus.target.x);
    const dx = focus.position.x - focus.target.x;
    const dy = focus.position.y - focus.target.y;
    const dz = focus.position.z - focus.target.z;
    const dist = Math.hypot(dx, dy, dz);
    expect(dist).toBeCloseTo(1650);
    expect(dx).toBeCloseTo(0);
    expect(dz).toBeLessThan(0);
    expect(Math.atan2(dy, -dz)).toBeCloseTo(Math.PI / 4, 2);
  });

  it("grab-pans a top-down map camera along screen axes", () => {
    const camera = new THREE.PerspectiveCamera(55, 1, 0.25, 200000);
    camera.up.set(0, 0, -1);
    camera.position.set(0, 200, 0);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const delta = new THREE.Vector3();

    panDeltaFromScreen(camera, 10, 0, 1, delta);
    expect(delta.x).toBeLessThan(0);
    expect(delta.z).toBeCloseTo(0);

    panDeltaFromScreen(camera, 0, 10, 1, delta);
    expect(delta.x).toBeCloseTo(0);
    expect(delta.z).toBeLessThan(0);
  });
});
