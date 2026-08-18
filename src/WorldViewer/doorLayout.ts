import { isDoorStackPin, isPortalOverworldPair, pickLayerZ } from "./layoutGraph";
import { doorLinkedPose } from "./doorGeometry";
import { DoorConnection, MapPose, ParsedMap } from "./types";

export interface PortalRigidGroups {
  rootByMap: Map<string, string>;
  membersByRoot: Map<string, Set<string>>;
}

export interface StackPinAnchor {
  anchorId: string;
  edge: DoorConnection;
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
    if (!isPortalOverworldPair(fromMap, toMap)) {
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

/** Maps whose XY is fixed to a stack-pin parent door after slab moves. */
export function buildDoorLockedSet(doorAligned: Set<string>): Set<string> {
  const locked = new Set<string>(["main"]);
  for (const mapId of doorAligned) {
    locked.add(mapId);
  }
  return locked;
}

/** One stack-pin parent per locked child — computed once from door topology. */
export function buildStackPinAnchors(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  doorLocked: Set<string>,
  layerHeight: number,
): Map<string, StackPinAnchor> {
  const anchors = new Map<string, StackPinAnchor>();
  for (const mapId of doorLocked) {
    if (mapId === "main") {
      continue;
    }
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
      if (!parentMap || !childMap || !isDoorStackPin(parentMap, childMap, edge.twoWay)) {
        continue;
      }
      const anchorPose = poses[anchorId];
      const childPose = poses[mapId];
      if (!anchorPose || !childPose) {
        continue;
      }
      const expectedZ = pickLayerZ(parentMap, childMap, anchorPose, layerHeight);
      const zDelta = Math.abs(expectedZ - childPose.z);
      if (!best || zDelta < best.zDelta) {
        best = { anchorId, edge, zDelta };
      }
    }
    if (best) {
      anchors.set(mapId, { anchorId: best.anchorId, edge: best.edge });
    }
  }
  return anchors;
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
  if (!isDoorStackPin(parentMap, childMap, edge.twoWay)) {
    return null;
  }
  const linked = doorLinkedPose(anchorPose, edge, mapId);
  return {
    x: linked.x,
    y: linked.y,
    z: pickLayerZ(parentMap, childMap, anchorPose, layerHeight),
  };
}

/** Re-apply door ports after slab separation moves a parent on another layer. */
export function realignDoorLocked(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  stackPinAnchors: Map<string, StackPinAnchor>,
  layerHeight: number,
): boolean {
  const maxPasses = stackPinAnchors.size + 2;
  let anyMoved = false;
  for (let pass = 0; pass < maxPasses; pass += 1) {
    let moved = false;
    for (const [mapId, port] of stackPinAnchors) {
      if (mapId === "main") {
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
        anyMoved = true;
      }
    }
    if (!moved) {
      break;
    }
  }
  return anyMoved;
}
