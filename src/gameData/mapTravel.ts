import type { GMap, GNpc } from "typed-adventureland";

import type { CustomGData } from "../GDataContext";

export type TravelEdgeKind = "door" | "transporter";

export type TravelEdge = {
  fromMap: string;
  toMap: string;
  kind: TravelEdgeKind;
  /** Human label for the hop (transporter name, or destination map name). */
  label: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  lock?: string;
  /** Transporter NPC id when kind is transporter. */
  viaNpcId?: string;
  /** Transporter skin for map markers. */
  viaNpcSkin?: string;
};

export type TravelHop = TravelEdge;

export type TravelPath = {
  startMap: string;
  endMap: string;
  maps: string[];
  hops: TravelHop[];
};

const DEFAULT_START = "main";

function mapName(G: CustomGData, mapKey: string): string {
  const maps = G.maps as unknown as Record<string, GMap | undefined>;
  return maps[mapKey]?.name ?? mapKey;
}

function readSpawn(
  maps: Record<string, GMap | undefined>,
  mapKey: string,
  spawnIndex: number,
): { x: number; y: number } | null {
  const map = maps[mapKey];
  const spawn = map?.spawns?.[spawnIndex];
  if (!Array.isArray(spawn) || typeof spawn[0] !== "number" || typeof spawn[1] !== "number") {
    return null;
  }
  return { x: spawn[0], y: spawn[1] };
}

function readDoor(door: GMap["doors"][number]): {
  x: number;
  y: number;
  toMap: string;
  destSpawn: number;
  lock?: string;
} | null {
  if (!Array.isArray(door) || door.length < 6) return null;
  const x = door[0];
  const y = door[1];
  const toMap = door[4];
  const destSpawn = door[5];
  if (typeof x !== "number" || typeof y !== "number") return null;
  if (typeof toMap !== "string" || typeof destSpawn !== "number") return null;
  const lock = typeof door[7] === "string" ? door[7] : undefined;
  return { x, y, toMap, destSpawn, lock };
}

/** Door edges from `G.maps[*].doors` (directed). */
export function collectDoorTravelEdges(G: CustomGData): TravelEdge[] {
  const maps = G.maps as unknown as Record<string, GMap | undefined>;
  const edges: TravelEdge[] = [];
  for (const [fromMap, map] of Object.entries(maps)) {
    if (!map?.doors) continue;
    for (const raw of map.doors) {
      const door = readDoor(raw);
      if (!door || !maps[door.toMap]) continue;
      const dest = readSpawn(maps, door.toMap, door.destSpawn);
      if (!dest) continue;
      edges.push({
        fromMap,
        toMap: door.toMap,
        kind: "door",
        label: mapName(G, door.toMap),
        fromX: door.x,
        fromY: door.y,
        toX: dest.x,
        toY: dest.y,
        lock: door.lock,
      });
    }
  }
  return edges;
}

/**
 * Transporter edges: every map that hosts an NPC with `places` can hop to each
 * destination spawn listed in `places`.
 */
export function collectTransporterTravelEdges(G: CustomGData): TravelEdge[] {
  const maps = G.maps as unknown as Record<string, GMap | undefined>;
  const npcs = G.npcs as unknown as Record<string, GNpc | undefined>;
  const edges: TravelEdge[] = [];

  for (const [npcId, npc] of Object.entries(npcs)) {
    if (!npc) continue;
    const places = npc.places as Record<string, number> | undefined;
    if (!places) continue;
    const label = npc.name ?? npcId;
    const hostMaps = G.indexes.npcMaps.get(npcId) ?? [];
    for (const host of hostMaps) {
      if (host.posX == null || host.posY == null) continue;
      for (const [toMap, spawnIndex] of Object.entries(places)) {
        if (toMap === host.mapKey || !maps[toMap]) continue;
        const dest = readSpawn(maps, toMap, spawnIndex);
        if (!dest) continue;
        edges.push({
          fromMap: host.mapKey,
          toMap,
          kind: "transporter",
          label,
          fromX: host.posX,
          fromY: host.posY,
          toX: dest.x,
          toY: dest.y,
          viaNpcId: npcId,
          viaNpcSkin: npc.skin ?? npcId,
        });
      }
    }
  }
  return edges;
}

export function buildTravelEdges(G: CustomGData): TravelEdge[] {
  return [...collectDoorTravelEdges(G), ...collectTransporterTravelEdges(G)];
}

/**
 * Shortest hop path between maps (BFS). Prefer door edges when equal length
 * by exploring doors before transporters at each node (stable edge order).
 */
export function findTravelPath(
  edges: TravelEdge[],
  startMap: string,
  endMap: string,
): TravelPath | null {
  if (startMap === endMap) {
    return { startMap, endMap, maps: [startMap], hops: [] };
  }

  const byFrom = new Map<string, TravelEdge[]>();
  for (const edge of edges) {
    const list = byFrom.get(edge.fromMap);
    if (list) list.push(edge);
    else byFrom.set(edge.fromMap, [edge]);
  }
  for (const list of byFrom.values()) {
    list.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "door" ? -1 : 1;
      return a.toMap.localeCompare(b.toMap);
    });
  }

  const prev = new Map<string, { via: TravelEdge; from: string }>();
  const queue = [startMap];
  const seen = new Set<string>([startMap]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) break;
    const outs = byFrom.get(current) ?? [];
    for (const edge of outs) {
      if (seen.has(edge.toMap)) continue;
      seen.add(edge.toMap);
      prev.set(edge.toMap, { via: edge, from: current });
      if (edge.toMap === endMap) {
        const hops: TravelHop[] = [];
        let cursor = endMap;
        while (cursor !== startMap) {
          const step = prev.get(cursor);
          if (!step) return null;
          hops.unshift(step.via);
          cursor = step.from;
        }
        const maps = [startMap, ...hops.map((h) => h.toMap)];
        return { startMap, endMap, maps, hops };
      }
      queue.push(edge.toMap);
    }
  }
  return null;
}

/** Prefer Mainland as the travel origin; fall back to `endMap` when unknown. */
export function travelPathToMap(
  G: CustomGData,
  endMap: string,
  startMap: string = DEFAULT_START,
): TravelPath | null {
  const edges = buildTravelEdges(G);
  const maps = G.maps as unknown as Record<string, GMap | undefined>;
  if (!maps[endMap]) return null;
  const origin = maps[startMap] ? startMap : endMap;
  return findTravelPath(edges, origin, endMap);
}

export function travelPathLabels(G: CustomGData, path: TravelPath): string[] {
  const parts: string[] = [mapName(G, path.startMap)];
  for (const hop of path.hops) {
    if (hop.kind === "transporter") {
      parts.push(hop.label);
    }
    parts.push(mapName(G, hop.toMap));
  }
  return parts;
}

/** One-line how-to steps for the path (skimmable without reading maps). */
export function travelPathHowTo(G: CustomGData, path: TravelPath): string[] {
  const steps: string[] = [];
  for (const hop of path.hops) {
    const fromName = mapName(G, hop.fromMap);
    if (hop.kind === "transporter") {
      steps.push(`Take ${hop.label} on ${fromName}`);
    } else if (hop.lock) {
      steps.push(`Enter door on ${fromName} (needs ${hop.lock})`);
    } else {
      steps.push(`Enter door on ${fromName}`);
    }
  }
  if (steps.length === 0) {
    steps.push(`Already on ${mapName(G, path.endMap)}`);
  }
  return steps;
}

/** World viewer deep link focused on a map point. */
export function worldFocusHref(mapKey: string, x?: number | null, y?: number | null): string {
  const params = new URLSearchParams();
  params.set("map", mapKey);
  if (x != null && Number.isFinite(x) && y != null && Number.isFinite(y)) {
    params.set("x", String(Math.round(x)));
    params.set("y", String(Math.round(y)));
  }
  params.set("mode", "map");
  return `/world#${params.toString()}`;
}

export type TravelDirectionAction = {
  kind: TravelEdgeKind;
  instruction: string;
  lock?: string;
  viaNpcId?: string;
  viaNpcSkin?: string;
  fromX: number;
  fromY: number;
  /** Display name of the map this hop arrives on. */
  toMapName: string;
};

/** Google Maps–style place nodes + actions between them. */
export type TravelDirectionLeg = {
  mapKey: string;
  mapName: string;
  role: "start" | "via" | "end";
  /** Action taken *from* this place to reach the next (absent on end). */
  action?: TravelDirectionAction;
  worldHref: string;
  focusX: number | null;
  focusY: number | null;
};

export function travelPathDirections(
  G: CustomGData,
  path: TravelPath,
  endFocus?: { x: number | null; y: number | null },
): TravelDirectionLeg[] {
  const legs: TravelDirectionLeg[] = [];
  for (let i = 0; i < path.maps.length; i += 1) {
    const mapKey = path.maps[i];
    const hop = path.hops[i];
    const isStart = i === 0;
    const isEnd = i === path.maps.length - 1;
    let focusX: number | null = null;
    let focusY: number | null = null;
    if (hop) {
      focusX = hop.fromX;
      focusY = hop.fromY;
    } else if (isEnd && endFocus) {
      focusX = endFocus.x;
      focusY = endFocus.y;
    } else if (i > 0) {
      const prev = path.hops[i - 1];
      focusX = prev?.toX ?? null;
      focusY = prev?.toY ?? null;
    }

    let action: TravelDirectionAction | undefined;
    if (hop) {
      action = {
        kind: hop.kind,
        instruction:
          hop.kind === "transporter"
            ? `Take ${hop.label}`
            : hop.lock
            ? `Enter door (needs ${hop.lock})`
            : "Enter door",
        lock: hop.lock,
        viaNpcId: hop.viaNpcId,
        viaNpcSkin: hop.viaNpcSkin,
        fromX: hop.fromX,
        fromY: hop.fromY,
        toMapName: mapName(G, hop.toMap),
      };
    }

    legs.push({
      mapKey,
      mapName: mapName(G, mapKey),
      role: isStart ? "start" : isEnd ? "end" : "via",
      action,
      worldHref: worldFocusHref(mapKey, focusX, focusY),
      focusX,
      focusY,
    });
  }
  return legs;
}

export { DEFAULT_START as TRAVEL_DEFAULT_START };
