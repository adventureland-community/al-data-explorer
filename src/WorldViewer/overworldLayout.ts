import { PortalRigidGroups } from "./doorLayout";
import { placeGroupShortestDoorClearance } from "./doorPlacement";
import { isPortalOverworldPair } from "./layoutGraph";
import { componentArtBounds, shiftMapPoses, ComponentArtBounds } from "./layoutBounds";
import { mapCenterWorld } from "./worldCameraBounds";
import { DEFAULT_SLAB_GAP, mapArtRect, minCardinalClearance } from "./rectLayout";
import { pickShortestOption } from "./doorGeometry";
import { DoorConnection, MapPose, ParsedMap } from "./types";

export type { ComponentArtBounds };
export { componentArtBounds, shiftMapPoses } from "./layoutBounds";

export interface PackShelf {
  cursorX: number;
  cursorY: number;
  rowHeight: number;
}

export const COMPONENT_PACK_GAP = 2800;
export const COMPONENT_ROW_WIDTH = 42000;

/** Place the next disconnected component on a 2D shelf (rows that wrap). */
export function packComponentOnShelf(
  shelf: PackShelf,
  bounds: ComponentArtBounds,
  gap = COMPONENT_PACK_GAP,
): { dx: number; dy: number } {
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  if (shelf.cursorX > 0 && shelf.cursorX + width > COMPONENT_ROW_WIDTH) {
    shelf.cursorX = 0;
    shelf.cursorY += shelf.rowHeight + gap;
    shelf.rowHeight = 0;
  }
  const dx = shelf.cursorX - bounds.minX;
  const dy = shelf.cursorY - bounds.minY;
  shelf.cursorX += width + gap;
  shelf.rowHeight = Math.max(shelf.rowHeight, height);
  return { dx, dy };
}

function isDirectMainOverworldNeighbor(
  mapId: string,
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
): boolean {
  if (mapId === "main" || maps[mapId]?.band !== "overworld") {
    return false;
  }
  for (const edge of connections) {
    if (edge.fromMap === "main" && edge.toMap === mapId) {
      return true;
    }
    if (edge.toMap === "main" && edge.fromMap === mapId) {
      return true;
    }
  }
  return false;
}

function portalGroupIds(portalGroups: PortalRigidGroups, rootId: string): string[] {
  return [...(portalGroups.membersByRoot.get(rootId) || new Set([rootId]))];
}

function groupTouchesMain(
  rootId: string,
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
): boolean {
  return portalGroupIds(portalGroups, rootId).some((id) =>
    isDirectMainOverworldNeighbor(id, maps, connections),
  );
}

/** Hub plus overworld portal groups already placed against main. Later maps must not overlap these. */
export function mainPortalAnchorIds(
  maps: Record<string, ParsedMap>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
): Set<string> {
  const anchors = new Set<string>(["main"]);
  for (const [root, members] of portalGroups.membersByRoot.entries()) {
    if (!groupTouchesMain(root, maps, connections, portalGroups)) {
      continue;
    }
    for (const id of members) {
      anchors.add(id);
    }
  }
  return anchors;
}

function connectionDegree(connections: DoorConnection[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const edge of connections) {
    degree.set(edge.fromMap, (degree.get(edge.fromMap) || 0) + 1);
    degree.set(edge.toMap, (degree.get(edge.toMap) || 0) + 1);
  }
  return degree;
}

function groupHasConnections(groupIds: string[], degree: Map<string, number>): boolean {
  return groupIds.some((id) => (degree.get(id) || 0) > 0);
}

/** Extra ring distance for overworld maps with zero door connections. */
export const ISOLATED_OVERWORLD_EXTRA_RINGS = 2;

function collectOverworldSatelliteRoots(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
  degree: Map<string, number>,
  includeIsolated: boolean,
): string[] {
  const mainPose = poses.main;
  if (!mainPose) {
    return [];
  }

  const roots: string[] = [];
  const seen = new Set<string>();
  for (const [id, map] of Object.entries(maps)) {
    if (id === "main" || map.band !== "overworld") {
      continue;
    }
    const pose = poses[id];
    if (!pose || pose.z !== mainPose.z) {
      continue;
    }
    const root = portalGroups.rootByMap.get(id) || id;
    if (seen.has(root)) {
      continue;
    }
    if (groupTouchesMain(root, maps, connections, portalGroups)) {
      continue;
    }
    const members = portalGroups.membersByRoot.get(root);
    if (members && members.size > 1) {
      continue;
    }
    const groupIds = portalGroupIds(portalGroups, root);
    const isolated = !groupHasConnections(groupIds, degree);
    if (isolated !== includeIsolated) {
      continue;
    }
    seen.add(root);
    roots.push(root);
  }
  return roots;
}

function placeOnRadialRings(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  portalGroups: PortalRigidGroups,
  roots: string[],
  mainCenter: { x: number; z: number },
  ringStep: number,
  ringOffset: number,
): void {
  if (roots.length === 0) {
    return;
  }

  roots.sort((a, b) => {
    const boundsA = componentArtBounds(maps, poses, portalGroupIds(portalGroups, a));
    const boundsB = componentArtBounds(maps, poses, portalGroupIds(portalGroups, b));
    const angleA = Math.atan2(
      (boundsA.minY + boundsA.maxY) / 2 - mainCenter.z,
      (boundsA.minX + boundsA.maxX) / 2 - mainCenter.x,
    );
    const angleB = Math.atan2(
      (boundsB.minY + boundsB.maxY) / 2 - mainCenter.z,
      (boundsB.minX + boundsB.maxX) / 2 - mainCenter.x,
    );
    return angleA - angleB;
  });

  const slotsPerRing = Math.max(4, Math.ceil(Math.sqrt(roots.length * 2)));
  let ring = 0;
  let slot = 0;

  for (const rootId of roots) {
    const groupIds = portalGroupIds(portalGroups, rootId);
    const bounds = componentArtBounds(maps, poses, groupIds);
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;

    const angle = (2 * Math.PI * slot) / slotsPerRing - Math.PI / 2 + ring * 0.35;
    const dist = ringStep * (ringOffset + ring + 1);
    const targetX = mainCenter.x + Math.cos(angle) * dist;
    const targetY = mainCenter.z + Math.sin(angle) * dist;

    shiftMapPoses(poses, groupIds, targetX - centerX, targetY - centerY);

    slot += 1;
    if (slot >= slotsPerRing) {
      slot = 0;
      ring += 1;
    }
  }
}

/**
 * Arrange instance overworld maps (not directly doored to main) on rings around the hub
 * instead of a single horizontal strip from slab separation.
 */
export function spreadOverworldSatellites(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
  gap: number,
): void {
  const mainPose = poses.main;
  const mainMap = maps.main;
  if (!mainPose || !mainMap) {
    return;
  }

  const mainCenter = mapCenterWorld(mainMap, mainPose);
  const mainSpan = Math.max(mainMap.artMaxX - mainMap.artMinX, mainMap.artMaxY - mainMap.artMinY);
  const ringStep = mainSpan * 0.45 + gap + 900;
  const degree = connectionDegree(connections);
  const roots = collectOverworldSatelliteRoots(
    maps,
    poses,
    connections,
    portalGroups,
    degree,
    false,
  );
  placeOnRadialRings(maps, poses, portalGroups, roots, mainCenter, ringStep, 0);
}

/** Push doorless overworld maps onto outer rings so they sit beyond connected satellites. */
export function spreadIsolatedOverworldMaps(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
  gap: number,
): void {
  const mainPose = poses.main;
  const mainMap = maps.main;
  if (!mainPose || !mainMap) {
    return;
  }

  const mainCenter = mapCenterWorld(mainMap, mainPose);
  const mainSpan = Math.max(mainMap.artMaxX - mainMap.artMinX, mainMap.artMaxY - mainMap.artMinY);
  const ringStep = mainSpan * 0.45 + gap + 900;
  const degree = connectionDegree(connections);
  const roots = collectOverworldSatelliteRoots(
    maps,
    poses,
    connections,
    portalGroups,
    degree,
    true,
  );
  placeOnRadialRings(
    maps,
    poses,
    portalGroups,
    roots,
    mainCenter,
    ringStep,
    ISOLATED_OVERWORLD_EXTRA_RINGS,
  );
}

function findMainPortalEdge(
  connections: DoorConnection[],
  groupMembers: Set<string>,
): { edge: DoorConnection; neighborId: string } | null {
  for (const edge of connections) {
    if (edge.fromMap === "main" && groupMembers.has(edge.toMap)) {
      return { edge, neighborId: edge.toMap };
    }
    if (edge.toMap === "main" && groupMembers.has(edge.fromMap)) {
      return { edge, neighborId: edge.fromMap };
    }
  }
  return null;
}

/** Move a main-adjacent portal group off the hub with the shortest straight door link. */
export function separateMainPortalGroups(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
  gap = DEFAULT_SLAB_GAP,
): void {
  const mainMap = maps.main;
  const mainPose = poses.main;
  if (!mainMap || !mainPose) {
    return;
  }
  const mainRect = mapArtRect(mainMap, mainPose);
  const seen = new Set<string>();

  for (const [root, members] of portalGroups.membersByRoot.entries()) {
    if (seen.has(root) || !groupTouchesMain(root, maps, connections, portalGroups)) {
      continue;
    }
    seen.add(root);
    const groupIds = [...members];
    const mainLink = findMainPortalEdge(connections, members);
    if (!mainLink) {
      const groupRect = componentArtBounds(maps, poses, groupIds);
      const options = minCardinalClearance(mainRect, groupRect, gap);
      const offset = pickShortestOption(options, (option) => Math.hypot(option.dx, option.dy));
      if (offset.dx !== 0 || offset.dy !== 0) {
        shiftMapPoses(poses, groupIds, offset.dx, offset.dy);
      }
      continue;
    }

    const { edge, neighborId } = mainLink;
    placeGroupShortestDoorClearance(maps, poses, {
      anchorMapId: "main",
      groupIds,
      linkedMapId: neighborId,
      edge,
      fixedRect: mainRect,
      gap,
      anchorDoorMapId: "main",
      groupDoorAt: (linkedPose) =>
        edge.fromMap === neighborId
          ? { x: linkedPose.x + edge.fromX, y: linkedPose.y + edge.fromY }
          : { x: linkedPose.x + edge.toX, y: linkedPose.y + edge.toY },
    });
  }
}

/**
 * Place overworld portal pairs on one Z slab with the shortest straight door link
 * that still clears both map footprints.
 */
export function resolvePortalPairLayout(
  maps: Record<string, ParsedMap>,
  poses: Record<string, MapPose>,
  connections: DoorConnection[],
  portalGroups: PortalRigidGroups,
  gap = DEFAULT_SLAB_GAP,
): void {
  for (const members of portalGroups.membersByRoot.values()) {
    if (members.size < 2) {
      continue;
    }
    const zs = [...members].map((id) => poses[id]?.z ?? 0);
    const sharedZ = Math.min(...zs);
    for (const id of members) {
      if (poses[id]) {
        poses[id].z = sharedZ;
      }
    }
  }

  const seenPairs = new Set<string>();
  for (const edge of connections) {
    const fromMap = maps[edge.fromMap];
    const toMap = maps[edge.toMap];
    if (!fromMap || !toMap || !isPortalOverworldPair(fromMap, toMap)) {
      continue;
    }
    if (edge.fromMap === "main" || edge.toMap === "main") {
      continue;
    }
    const pairKey = [edge.fromMap, edge.toMap].sort().join("|");
    if (seenPairs.has(pairKey)) {
      continue;
    }
    seenPairs.add(pairKey);

    const anchorId = edge.fromMap;
    const childId = edge.toMap;
    const anchorPose = poses[anchorId];
    if (!anchorPose) {
      continue;
    }

    const childZ = poses[childId]?.z ?? anchorPose.z;
    placeGroupShortestDoorClearance(maps, poses, {
      anchorMapId: anchorId,
      groupIds: [childId],
      linkedMapId: childId,
      edge,
      fixedRect: mapArtRect(fromMap, anchorPose),
      gap,
      anchorDoorMapId: anchorId,
      groupDoorAt: (linkedPose) => ({
        x: linkedPose.x + edge.toX,
        y: linkedPose.y + edge.toY,
      }),
    });
    if (poses[childId]) {
      poses[childId].z = childZ;
    }
  }
}
