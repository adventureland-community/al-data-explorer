import { collectConnections } from "./layoutWorld";
import { buildAdjacency, doorGraphDepth, findComponents, pickComponentRoot } from "./layoutGraph";
import { mapArtRect, rectsOverlap } from "./rectLayout";
import { MapPose, WorldLayout } from "./types";

export interface LayoutComponent {
  id: string;
  mapIds: string[];
  rootId: string;
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
      maxDepth: doorGraphDepth(rootId, mapIdsInComponent, connections),
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
    z: layout.poses[id].z,
    ...mapArtRect(layout.maps[id], layout.poses[id]),
  }));
  const overlaps: LayoutOverlap[] = [];
  let artOverlapsSameZ = 0;
  let artOverlapsAnyZ = 0;
  for (let i = 0; i < bounds.length; i += 1) {
    for (let j = i + 1; j < bounds.length; j += 1) {
      if (!rectsOverlap(bounds[i], bounds[j], 0)) {
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
