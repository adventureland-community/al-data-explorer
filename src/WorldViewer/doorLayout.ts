import {
  isDoorLayoutPin,
  isDoorStackPin,
  isPortalDoorAlign,
  isPortalOverworldPair,
  pickLayerZ,
} from "./layoutGraph";
import { DoorConnection, MapPose, ParsedMap } from "./types";

export interface PortalRigidGroups {
  rootByMap: Map<string, string>;
  membersByRoot: Map<string, Set<string>>;
}

/** Maps fixed on a slab — hub plus vertical stack-pin children (door XY fixed to parent). */
export function buildSlabImmovable(
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
): Set<string> {
  const immovable = new Set<string>(["main"]);
  for (const edge of connections) {
    const fromMap = maps[edge.fromMap];
    const toMap = maps[edge.toMap];
    if (fromMap && toMap && isDoorStackPin(fromMap, toMap, edge.twoWay)) {
      immovable.add(edge.toMap);
    }
  }
  return immovable;
}

/** Overworld portal doors move as rigid groups so separation preserves door XY. */
export function buildPortalRigidGroups(
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
  doorAligned: Set<string>,
): PortalRigidGroups {
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const existing = parent.get(id);
    if (!existing || existing === id) {
      parent.set(id, id);
      return id;
    }
    const root = find(existing);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) {
      parent.set(rootB, rootA);
    }
  };

  const portalMaps = new Set<string>();
  for (const edge of connections) {
    const fromMap = maps[edge.fromMap];
    const toMap = maps[edge.toMap];
    if (!fromMap || !toMap) {
      continue;
    }
    if (fromMap.band !== "overworld" || toMap.band !== "overworld") {
      continue;
    }
    if (edge.fromMap === "main" || edge.toMap === "main") {
      continue;
    }
    if (!isPortalDoorAlign(fromMap, toMap)) {
      continue;
    }
    if (!doorAligned.has(edge.fromMap) && !doorAligned.has(edge.toMap)) {
      continue;
    }
    union(edge.fromMap, edge.toMap);
    portalMaps.add(edge.fromMap);
    portalMaps.add(edge.toMap);
  }

  const rootByMap = new Map<string, string>();
  const membersByRoot = new Map<string, Set<string>>();
  for (const id of portalMaps) {
    if (id === "main") {
      continue;
    }
    const root = find(id);
    rootByMap.set(id, root);
    const members = membersByRoot.get(root) || new Set<string>();
    members.add(id);
    membersByRoot.set(root, members);
  }
  return { rootByMap, membersByRoot };
}

/** Hub + maps placed via port-locking door steps (derived from band rules, not manual pins). */
export function buildDoorLockedSet(doorAligned: Set<string>): Set<string> {
  const locked = new Set<string>(["main"]);
  for (const mapId of doorAligned) {
    locked.add(mapId);
  }
  return locked;
}

export function doorAlignedPose(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  anchorId: string,
  mapId: string,
  edge: DoorConnection,
  layerHeight: number,
): MapPose | null {
  const anchorPose = poses[anchorId];
  const parentMap = maps[anchorId];
  const childMap = maps[mapId];
  if (!anchorPose || !parentMap || !childMap) {
    return null;
  }
  if (!isDoorLayoutPin(parentMap, childMap)) {
    return null;
  }
  const forward = edge.fromMap === anchorId && edge.toMap === mapId;
  const x = forward ? anchorPose.x + edge.fromX - edge.toX : anchorPose.x - edge.fromX + edge.toX;
  const y = forward ? anchorPose.y + edge.fromY - edge.toY : anchorPose.y - edge.fromY + edge.toY;
  const z = pickLayerZ(parentMap, childMap, anchorPose, layerHeight);
  return { x, y, z };
}

function findPortAnchor(
  mapId: string,
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  layerHeight: number,
): { anchorId: string; edge: DoorConnection } | null {
  let best: { anchorId: string; edge: DoorConnection; zDelta: number } | null = null;
  for (const edge of connections) {
    let anchorId: string | null = null;
    if (edge.toMap === mapId && poses[edge.fromMap]) {
      anchorId = edge.fromMap;
    } else if (edge.fromMap === mapId && poses[edge.toMap]) {
      anchorId = edge.toMap;
    } else {
      continue;
    }
    const parentMap = maps[anchorId];
    const childMap = maps[mapId];
    if (!parentMap || !childMap || !isDoorLayoutPin(parentMap, childMap)) {
      continue;
    }
    // Overworld portal hops off the hub keep door XY only within the rigid group.
    // Re-snapping them to main after slab separation would ignore map sizes.
    if (anchorId === "main" && isPortalDoorAlign(parentMap, childMap)) {
      continue;
    }
    if (isPortalOverworldPair(parentMap, childMap)) {
      continue;
    }
    // Indoor/underground doors must not snap an overworld map back onto the hub slab.
    if (childMap.band === "overworld" && parentMap.band !== "overworld") {
      continue;
    }
    const expectedZ = pickLayerZ(parentMap, childMap, poses[anchorId], layerHeight);
    const zDelta = Math.abs(expectedZ - poses[mapId].z);
    if (!best || zDelta < best.zDelta) {
      best = { anchorId, edge, zDelta };
    }
  }
  return best ? { anchorId: best.anchorId, edge: best.edge } : null;
}

/** Re-apply door ports after slab separation moves a parent on another layer. */
export function realignDoorLocked(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  doorLocked: Set<string>,
  layerHeight: number,
): void {
  const maxPasses = doorLocked.size + 2;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let moved = false;
    for (const mapId of doorLocked) {
      if (mapId === "main") {
        continue;
      }
      const port = findPortAnchor(mapId, maps, poses, connections, layerHeight);
      if (!port) {
        continue;
      }
      const aligned = doorAlignedPose(maps, poses, port.anchorId, mapId, port.edge, layerHeight);
      if (!aligned) {
        continue;
      }
      const current = poses[mapId];
      if (current.x !== aligned.x || current.y !== aligned.y || current.z !== aligned.z) {
        poses[mapId] = aligned;
        moved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
}
