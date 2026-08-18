import { GNpc } from "typed-adventureland";
import { parseMaps, spawnPoint } from "./parseMaps";
import { DoorConnection, MapPose, MapSource, ParsedMap, WorldLayout } from "./types";

export const DEFAULT_LAYER_HEIGHT = 480;
const PACK_GAP = 2800;

function hasReverseDoor(maps: Record<string, ParsedMap>, fromMap: string, toMap: string): boolean {
  const dest = maps[toMap];
  if (!dest) {
    return false;
  }
  for (const door of dest.doors) {
    if (door.toMap === fromMap) {
      return true;
    }
  }
  return false;
}

export function verticalDelta(from: ParsedMap, to: ParsedMap): number {
  if (from.band === "overworld" && to.band === "underground") {
    return -1;
  }
  if (from.band === "underground" && to.band === "overworld") {
    return 1;
  }
  if (from.band === "overworld" && to.band === "indoor") {
    return 1;
  }
  if (from.band === "indoor" && to.band === "overworld") {
    return -1;
  }
  if (from.band === "indoor" && to.band === "underground") {
    return -1;
  }
  if (from.band === "underground" && to.band === "indoor") {
    return 1;
  }
  return 1;
}

function usedZLevels(poses: Record<string, MapPose>): Set<number> {
  const used = new Set<number>();
  for (const pose of Object.values(poses)) {
    used.add(pose.z);
  }
  return used;
}

function nextLayerZ(fromZ: number, delta: number, layerHeight: number, used: Set<number>): number {
  const step = delta === 0 ? 1 : Math.sign(delta);
  let z = fromZ + step * layerHeight;
  while (used.has(z)) {
    z += step * layerHeight;
  }
  return z;
}

export function collectConnections(maps: Record<string, ParsedMap>): DoorConnection[] {
  const connections: DoorConnection[] = [];
  for (const map of Object.values(maps)) {
    for (const door of map.doors) {
      if (!maps[door.toMap]) {
        continue;
      }
      const dest = spawnPoint(maps, door.toMap, door.destSpawn);
      if (!dest) {
        continue;
      }
      connections.push({
        fromMap: door.fromMap,
        toMap: door.toMap,
        fromX: door.x,
        fromY: door.y,
        toX: dest.x,
        toY: dest.y,
        twoWay: hasReverseDoor(maps, door.fromMap, door.toMap),
      });
    }
  }
  return connections;
}

function placeComponent(
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
  poses: Record<string, MapPose>,
  rootId: string,
  origin: MapPose,
  layerHeight: number,
): void {
  poses[rootId] = { ...origin };
  const queue = [rootId];
  const usedZ = usedZLevels(poses);

  while (queue.length > 0) {
    const fromId = queue.shift();
    if (!fromId) {
      break;
    }
    const fromPose = poses[fromId];
    const fromMap = maps[fromId];
    for (const edge of connections) {
      if (edge.fromMap !== fromId) {
        continue;
      }
      if (poses[edge.toMap]) {
        continue;
      }
      const toMap = maps[edge.toMap];
      if (!toMap) {
        continue;
      }
      const delta = verticalDelta(fromMap, toMap);
      const z = nextLayerZ(fromPose.z, delta, layerHeight, usedZ);
      usedZ.add(z);
      poses[edge.toMap] = {
        x: fromPose.x + edge.fromX - edge.toX,
        y: fromPose.y + edge.fromY - edge.toY,
        z,
      };
      queue.push(edge.toMap);
    }
  }
}

function componentSize(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  ids: string[],
): number {
  let maxX = 0;
  for (const id of ids) {
    const map = maps[id];
    const pose = poses[id];
    if (!map || !pose) {
      continue;
    }
    maxX = Math.max(maxX, pose.x + map.maxX);
  }
  return maxX;
}

export function layoutWorld(
  source: MapSource,
  layerHeight = DEFAULT_LAYER_HEIGHT,
  includeIgnored = false,
  npcDefs: Record<string, GNpc> = {},
): WorldLayout {
  const maps = parseMaps(source, includeIgnored, npcDefs);
  const connections = collectConnections(maps);
  const poses: Record<string, MapPose> = {};

  const roots = ["main", "winterland", "desertland", "halloween"].filter((id) => maps[id]);
  let packX = 0;

  const placeRoot = (rootId: string, origin: MapPose) => {
    const before = Object.keys(poses);
    placeComponent(maps, connections, poses, rootId, origin, layerHeight);
    const added = Object.keys(poses).filter((id) => !before.includes(id));
    packX = Math.max(packX, componentSize(maps, poses, added) + PACK_GAP);
  };

  for (const rootId of roots) {
    if (poses[rootId]) {
      continue;
    }
    placeRoot(rootId, { x: packX, y: 0, z: 0 });
  }

  const leftovers = Object.keys(maps).sort();
  for (const id of leftovers) {
    if (poses[id]) {
      continue;
    }
    placeRoot(id, { x: packX, y: 0, z: 0 });
  }

  return { maps, poses, connections };
}
