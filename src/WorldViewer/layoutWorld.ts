import { GNpc } from "typed-adventureland";
import {
  buildDoorLockedSet,
  buildPortalRigidGroups,
  buildSlabImmovable,
  buildStackPinAnchors,
  realignDoorLocked,
  StackPinAnchor,
} from "./doorLayout";
import { doorLinkedPose } from "./doorGeometry";
import { bandLayerZ, isDoorStackPin, pickComponentRoot, pickLayerZ } from "./layoutGraph";
import { componentArtBounds, shiftMapPoses } from "./layoutBounds";
import { resolveOneWayExitLayout } from "./oneWayExitLayout";
import {
  COMPONENT_PACK_GAP,
  mainPortalAnchorIds,
  packComponentOnShelf,
  resolvePortalPairLayout,
  separateMainPortalGroups,
  spreadIsolatedOverworldMaps,
  spreadOverworldSatellites,
} from "./overworldLayout";
import { parseMaps, spawnPoint } from "./parseMaps";
import {
  DEFAULT_SLAB_GAP,
  PINNED_SLAB_STEP,
  resolveDoorLockedSlabOverflow,
  resolveWorldSlabs,
} from "./rectLayout";
import { DoorConnection, MapPose, MapSource, ParsedMap, WorldLayout } from "./types";

export const DEFAULT_LAYER_HEIGHT = 480;

/** Slab/realign cycles after initial BFS placement — clears dense same-layer stacks. */
const SLAB_REALIGN_PASSES_INITIAL = 6;
/** Extra slab/realign cycles after overworld satellite spread. */
const SLAB_REALIGN_PASSES_POST_SPREAD = 3;

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
  if (from.band === to.band) {
    return 0;
  }
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

function placeFromEdge(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  doorAligned: Set<string>,
  fromId: string,
  toId: string,
  edge: DoorConnection,
  layerHeight: number,
): void {
  const fromPose = poses[fromId];
  const fromMap = maps[fromId];
  const toMap = maps[toId];
  if (!fromPose || !fromMap || !toMap) {
    return;
  }
  const linked = doorLinkedPose(fromPose, edge, toId);
  poses[toId] = {
    x: linked.x,
    y: linked.y,
    z: pickLayerZ(fromMap, toMap, fromPose, layerHeight),
  };
  if (isDoorStackPin(fromMap, toMap, edge.twoWay)) {
    doorAligned.add(toId);
  }
}

function placeComponent(
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
  poses: Record<string, MapPose>,
  doorAligned: Set<string>,
  rootId: string,
  origin: MapPose,
  layerHeight: number,
): void {
  poses[rootId] = { ...origin };
  const queue = [rootId];

  while (queue.length > 0) {
    const fromId = queue.shift();
    if (!fromId) {
      break;
    }
    for (const edge of connections) {
      if (edge.fromMap === fromId && !poses[edge.toMap]) {
        placeFromEdge(maps, poses, doorAligned, fromId, edge.toMap, edge, layerHeight);
        queue.push(edge.toMap);
      } else if (edge.toMap === fromId && !poses[edge.fromMap]) {
        placeFromEdge(maps, poses, doorAligned, fromId, edge.fromMap, edge, layerHeight);
        queue.push(edge.fromMap);
      }
    }
  }
}

function buildAdjacency(connections: DoorConnection[]): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  const touch = (a: string, b: string) => {
    if (!adj.has(a)) {
      adj.set(a, new Set());
    }
    adj.get(a)?.add(b);
  };
  for (const edge of connections) {
    touch(edge.fromMap, edge.toMap);
    touch(edge.toMap, edge.fromMap);
  }
  return adj;
}

function findComponents(mapIds: string[], adj: Map<string, Set<string>>): string[][] {
  const remaining = new Set(mapIds);
  const components: string[][] = [];
  while (remaining.size > 0) {
    const start = [...remaining].sort()[0];
    const queue = [start];
    const component: string[] = [];
    remaining.delete(start);
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) {
        break;
      }
      component.push(id);
      for (const next of adj.get(id) || []) {
        if (remaining.has(next)) {
          remaining.delete(next);
          queue.push(next);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function sortComponents(components: string[][]): string[][] {
  return components.sort((a, b) => {
    const aHasMain = a.includes("main") ? 0 : 1;
    const bHasMain = b.includes("main") ? 0 : 1;
    if (aHasMain !== bHasMain) {
      return aHasMain - bHasMain;
    }
    return b.length - a.length;
  });
}

function runSlabRealignPasses(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  stackPinAnchors: Map<string, StackPinAnchor>,
  slabImmovable: Set<string>,
  portalGroups: ReturnType<typeof buildPortalRigidGroups>,
  layerHeight: number,
  passes: number,
): void {
  for (let pass = 0; pass < passes; pass += 1) {
    resolveWorldSlabs(maps, poses, slabImmovable, DEFAULT_SLAB_GAP, portalGroups);
    realignDoorLocked(maps, poses, stackPinAnchors, layerHeight);
  }
}

function applyDoorLinkedPlacements(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  portalGroups: ReturnType<typeof buildPortalRigidGroups>,
): void {
  resolvePortalPairLayout(maps, poses, connections, portalGroups, DEFAULT_SLAB_GAP);
  separateMainPortalGroups(maps, poses, connections, portalGroups, DEFAULT_SLAB_GAP);
  resolveOneWayExitLayout(maps, poses, connections, DEFAULT_SLAB_GAP);
}

function finalizeOverworldSlab(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  stackPinAnchors: Map<string, StackPinAnchor>,
  slabImmovable: Set<string>,
  portalGroups: ReturnType<typeof buildPortalRigidGroups>,
  connections: DoorConnection[],
  layerHeight: number,
): void {
  const overworldAnchors = mainPortalAnchorIds(maps, connections, portalGroups);
  const overworldImmovable = new Set([...slabImmovable, ...overworldAnchors]);
  resolveWorldSlabs(maps, poses, overworldImmovable, DEFAULT_SLAB_GAP, portalGroups);
  realignDoorLocked(maps, poses, stackPinAnchors, layerHeight);
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
  const doorAligned = new Set<string>();
  const mapIds = Object.keys(maps);
  const adj = buildAdjacency(connections);
  const components = sortComponents(findComponents(mapIds, adj));

  let packShelf = { cursorX: 0, cursorY: 0, rowHeight: 0 };

  for (const component of components) {
    const isMainHub = component.includes("main");
    const rootId = isMainHub ? "main" : pickComponentRoot(component, connections, maps);
    const before = Object.keys(poses);
    const origin: MapPose = isMainHub
      ? { x: 0, y: 0, z: 0 }
      : {
          x: 0,
          y: 0,
          z: bandLayerZ(maps[rootId].band, layerHeight),
        };
    placeComponent(maps, connections, poses, doorAligned, rootId, origin, layerHeight);
    const added = Object.keys(poses).filter((id) => !before.includes(id));

    if (isMainHub) {
      const bounds = componentArtBounds(maps, poses, added);
      packShelf = {
        cursorX: 0,
        cursorY: bounds.maxY + COMPONENT_PACK_GAP,
        rowHeight: 0,
      };
      continue;
    }

    const bounds = componentArtBounds(maps, poses, added);
    const { dx, dy } = packComponentOnShelf(packShelf, bounds, COMPONENT_PACK_GAP);
    shiftMapPoses(poses, added, dx, dy);
  }

  const doorLocked = buildDoorLockedSet(doorAligned);
  const stackPinAnchors = buildStackPinAnchors(maps, poses, connections, doorLocked, layerHeight);
  const slabImmovable = buildSlabImmovable(maps, connections);
  const portalGroups = buildPortalRigidGroups(maps, connections);
  realignDoorLocked(maps, poses, stackPinAnchors, layerHeight);
  runSlabRealignPasses(
    maps,
    poses,
    stackPinAnchors,
    slabImmovable,
    portalGroups,
    layerHeight,
    SLAB_REALIGN_PASSES_INITIAL,
  );
  spreadOverworldSatellites(maps, poses, connections, portalGroups, DEFAULT_SLAB_GAP);
  runSlabRealignPasses(
    maps,
    poses,
    stackPinAnchors,
    slabImmovable,
    portalGroups,
    layerHeight,
    SLAB_REALIGN_PASSES_POST_SPREAD,
  );
  resolveDoorLockedSlabOverflow(
    maps,
    poses,
    doorLocked,
    PINNED_SLAB_STEP,
    512,
    DEFAULT_SLAB_GAP,
    portalGroups,
  );
  applyDoorLinkedPlacements(maps, poses, connections, portalGroups);
  spreadIsolatedOverworldMaps(maps, poses, connections, portalGroups, DEFAULT_SLAB_GAP);
  finalizeOverworldSlab(
    maps,
    poses,
    stackPinAnchors,
    slabImmovable,
    portalGroups,
    connections,
    layerHeight,
  );

  return { maps, poses, connections };
}

/** Door-graph depth from a root within one connected component (for analysis UI). */
export function doorGraphDepth(
  rootId: string,
  component: string[],
  connections: DoorConnection[],
): number {
  const adj = buildAdjacency(connections);
  const depths = new Map<string, number>([[rootId, 0]]);
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id) {
      break;
    }
    const depth = depths.get(id) || 0;
    for (const next of adj.get(id) || []) {
      if (!component.includes(next) || depths.has(next)) {
        continue;
      }
      depths.set(next, depth + 1);
      queue.push(next);
    }
  }
  return Math.max(0, ...depths.values());
}

export { bandLabel, pickComponentRoot } from "./layoutGraph";
