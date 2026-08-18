import { collectConnections } from "./layoutWorld";
import { pickComponentRoot } from "./layoutGraph";
import { DoorConnection, MapPose, ParsedMap, WorldLayout } from "./types";

export interface LayoutComponent {
  id: string;
  mapIds: string[];
  rootId: string;
  hubId: string;
  maxDepth: number;
}

export interface LayoutOverlap {
  mapA: string;
  mapB: string;
  sameZ: boolean;
  poseA: MapPose;
  poseB: MapPose;
}

export interface LayoutStack {
  x: number;
  y: number;
  maps: Array<{ id: string; z: number; band: string }>;
}

export interface WorldLayoutReport {
  mapCount: number;
  placedCount: number;
  connectionCount: number;
  components: LayoutComponent[];
  exactPoseStacks: LayoutStack[];
  nearOriginMaps: string[];
  artOverlapsSameZ: number;
  artOverlapsAnyZ: number;
  overlaps: LayoutOverlap[];
}

function artBounds(map: ParsedMap, pose: MapPose) {
  return {
    minX: pose.x + map.artMinX,
    maxX: pose.x + map.artMaxX,
    minY: pose.y + map.artMinY,
    maxY: pose.y + map.artMaxY,
    z: pose.z,
  };
}

function boundsOverlap(a: ReturnType<typeof artBounds>, b: ReturnType<typeof artBounds>): boolean {
  return a.minX < b.maxX && b.minX < a.maxX && a.minY < b.maxY && b.minY < a.maxY;
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

function bfsDepth(rootId: string, component: string[], adj: Map<string, Set<string>>): number {
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

export function analyzeWorldLayout(layout: WorldLayout): WorldLayoutReport {
  const mapIds = Object.keys(layout.maps);
  const placedIds = Object.keys(layout.poses);
  const connections = layout.connections.length
    ? layout.connections
    : collectConnections(layout.maps);
  const adj = buildAdjacency(connections);
  const components = findComponents(mapIds, adj).map((mapIdsInComponent, index) => {
    const rootId = pickComponentRoot(mapIdsInComponent, connections, layout.maps);
    return {
      id: `component-${index}`,
      mapIds: mapIdsInComponent,
      rootId,
      hubId: rootId,
      maxDepth: bfsDepth(rootId, mapIdsInComponent, adj),
    };
  });

  const poseBuckets = new Map<string, LayoutStack>();
  for (const [id, pose] of Object.entries(layout.poses)) {
    const key = `${Math.round(pose.x)},${Math.round(pose.y)}`;
    const stack = poseBuckets.get(key) || { x: pose.x, y: pose.y, maps: [] };
    stack.maps.push({ id, z: pose.z, band: layout.maps[id]?.band || "indoor" });
    poseBuckets.set(key, stack);
  }
  const exactPoseStacks = [...poseBuckets.values()].filter((stack) => stack.maps.length > 1);

  const nearOriginMaps = placedIds.filter((id) => {
    const pose = layout.poses[id];
    return Math.abs(pose.x) < 2500 && Math.abs(pose.y) < 2500;
  });

  const bounds = placedIds.map((id) => ({
    id,
    ...artBounds(layout.maps[id], layout.poses[id]),
  }));
  const overlaps: LayoutOverlap[] = [];
  let artOverlapsSameZ = 0;
  let artOverlapsAnyZ = 0;
  for (let i = 0; i < bounds.length; i += 1) {
    for (let j = i + 1; j < bounds.length; j += 1) {
      if (!boundsOverlap(bounds[i], bounds[j])) {
        continue;
      }
      artOverlapsAnyZ += 1;
      if (bounds[i].z === bounds[j].z) {
        artOverlapsSameZ += 1;
      }
      overlaps.push({
        mapA: bounds[i].id,
        mapB: bounds[j].id,
        sameZ: bounds[i].z === bounds[j].z,
        poseA: layout.poses[bounds[i].id],
        poseB: layout.poses[bounds[j].id],
      });
    }
  }

  return {
    mapCount: mapIds.length,
    placedCount: placedIds.length,
    connectionCount: connections.length,
    components,
    exactPoseStacks,
    nearOriginMaps,
    artOverlapsSameZ,
    artOverlapsAnyZ,
    overlaps: overlaps.slice(0, 40),
  };
}
