import { DoorConnection, MapBand, MapPose, ParsedMap } from "./types";

/** Shared Z for every map in the same band (overworld / indoor / underground). */
export function bandLayerZ(band: MapBand, layerHeight: number): number {
  switch (band) {
    case "overworld":
      return 0;
    case "indoor":
      return layerHeight;
    case "underground":
      return -layerHeight;
    default: {
      const exhaustive: never = band;
      return exhaustive;
    }
  }
}

function parseLevelNum(id: string): number | null {
  const match = id.match(/^level(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** True when a cave door connects to a cove through a wall (same depth, door-aligned). */
export function isLateralCaveLink(fromMap: ParsedMap, toMap: ParsedMap): boolean {
  if (fromMap.band !== "underground" || toMap.band !== "underground") {
    return false;
  }
  return /cave/i.test(fromMap.id) && /cove/i.test(toMap.id);
}

/** True when an underground door steps to a deeper numbered level (level1 → level2). */
export function isSequentialDungeonDescent(fromMap: ParsedMap, toMap: ParsedMap): boolean {
  if (fromMap.band !== "underground" || toMap.band !== "underground") {
    return false;
  }
  const fromLevel = parseLevelNum(fromMap.id);
  const toLevel = parseLevelNum(toMap.id);
  return fromLevel !== null && toLevel !== null && toLevel > fromLevel;
}

/** Whether a door step keeps XY aligned (portal hops + vertical stack pins). */
export function isPortalDoorAlign(fromMap: ParsedMap, toMap: ParsedMap): boolean {
  if (fromMap.band === "overworld" && toMap.band === "overworld") {
    return true;
  }
  if (fromMap.band === "indoor" && toMap.band === "overworld") {
    return true;
  }
  if (fromMap.band === "underground" && toMap.band === "overworld") {
    return true;
  }
  return false;
}

/** Whether a door step should stay fixed on its slab (vertical stack pins only). */
export function isDoorStackPin(fromMap: ParsedMap, toMap: ParsedMap, twoWay = true): boolean {
  if (!twoWay) {
    return false;
  }
  if (fromMap.band === "indoor" && toMap.band === "indoor") {
    return true;
  }
  if (toMap.band === "indoor") {
    return true;
  }
  if (fromMap.band === "indoor" && toMap.band === "underground") {
    return true;
  }
  if (fromMap.band === "overworld" && toMap.band === "underground") {
    return true;
  }
  if (fromMap.band === "underground" && toMap.band === "underground") {
    return isSequentialDungeonDescent(fromMap, toMap) || isLateralCaveLink(fromMap, toMap);
  }
  return false;
}

/** Overworld portal hop (not stack pin) — doors link by a straight line, not co-located XY. */
export function isPortalOverworldPair(fromMap: ParsedMap, toMap: ParsedMap): boolean {
  return (
    fromMap.band === "overworld" && toMap.band === "overworld" && isPortalDoorAlign(fromMap, toMap)
  );
}

/** Z for a door step: dungeon chains stack down; band changes use the target band layer. */
export function pickLayerZ(
  fromMap: ParsedMap,
  toMap: ParsedMap,
  fromPose: MapPose,
  layerHeight: number,
): number {
  if (fromMap.band === "underground" && toMap.band === "underground") {
    if (isSequentialDungeonDescent(fromMap, toMap)) {
      return fromPose.z - layerHeight;
    }
    return fromPose.z;
  }
  if (fromMap.band === "indoor" && toMap.band === "indoor") {
    return fromPose.z + layerHeight;
  }
  if (fromMap.band === toMap.band) {
    return fromPose.z;
  }
  return bandLayerZ(toMap.band, layerHeight);
}

function doorDegree(component: string[], connections: DoorConnection[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const id of component) {
    degree.set(id, 0);
  }
  for (const edge of connections) {
    if (degree.has(edge.fromMap)) {
      degree.set(edge.fromMap, (degree.get(edge.fromMap) || 0) + 1);
    }
    if (degree.has(edge.toMap)) {
      degree.set(edge.toMap, (degree.get(edge.toMap) || 0) + 1);
    }
  }
  return degree;
}

/** Pick BFS root: highest door degree, then overworld, then known world anchors. */
export function pickComponentRoot(
  component: string[],
  connections: DoorConnection[],
  maps: Record<string, ParsedMap>,
): string {
  const degree = doorDegree(component, connections);
  return [...component].sort((a, b) => {
    const degDiff = (degree.get(b) || 0) - (degree.get(a) || 0);
    if (degDiff !== 0) {
      return degDiff;
    }
    const bandA = maps[a]?.band === "overworld" ? 0 : 1;
    const bandB = maps[b]?.band === "overworld" ? 0 : 1;
    if (bandA !== bandB) {
      return bandA - bandB;
    }
    return a.localeCompare(b);
  })[0];
}

export function bandLabel(band: MapBand): string {
  switch (band) {
    case "overworld":
      return "overworld";
    case "indoor":
      return "indoor";
    case "underground":
      return "underground";
    default: {
      const exhaustive: never = band;
      return exhaustive;
    }
  }
}

export function buildAdjacency(connections: DoorConnection[]): Map<string, Set<string>> {
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

export function findComponents(mapIds: string[], adj: Map<string, Set<string>>): string[][] {
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
