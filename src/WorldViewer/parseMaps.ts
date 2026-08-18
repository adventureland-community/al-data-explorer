import { GGeometry, GMap } from "typed-adventureland";
import { MapBand, MapSource, ParsedDoor, ParsedMap, PointFeature } from "./types";

const UNDERGROUND_PATTERN = /cave|tunnel|crypt|tomb|level|bank_b|bank_u|dungeon|mtunnel/i;

export function mapBand(id: string, map: GMap): MapBand {
  if (UNDERGROUND_PATTERN.test(id)) {
    return "underground";
  }
  if (map.outside) {
    return "overworld";
  }
  return "indoor";
}

export function bandHeightSign(band: MapBand): number {
  switch (band) {
    case "overworld":
      return 0;
    case "indoor":
      return 1;
    case "underground":
      return -1;
    default: {
      const exhaustive: never = band;
      return exhaustive;
    }
  }
}

function doorTuple(door: GMap["doors"][number]): ParsedDoor | null {
  const x = door[0];
  const y = door[1];
  const width = door[2];
  const height = door[3];
  const toMap = String(door[4]);
  const destSpawn = door[5];
  if (!toMap || typeof destSpawn !== "number") {
    return null;
  }
  const sourceSpawn = typeof door[6] === "number" ? door[6] : undefined;
  const lock = typeof door[7] === "string" ? door[7] : undefined;
  return {
    fromMap: "",
    toMap,
    x,
    y,
    width,
    height,
    destSpawn,
    sourceSpawn,
    lock,
  };
}

function includeMap(map: GMap, includeIgnored: boolean): boolean {
  if (!includeIgnored && (map.ignore || map.unlist)) {
    return false;
  }
  return true;
}

function expandBounds(
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  x: number,
  y: number,
): [number, number, number, number] {
  return [Math.min(minX, x), Math.min(minY, y), Math.max(maxX, x), Math.max(maxY, y)];
}

function npcPoints(map: GMap): PointFeature[] {
  const points: PointFeature[] = [];
  for (const npc of map.npcs || []) {
    const label = npc.name || npc.id;
    if (npc.position) {
      points.push({ x: npc.position[0], y: npc.position[1], label });
    }
    if (npc.positions) {
      for (const position of npc.positions) {
        points.push({ x: position[0], y: position[1], label });
      }
    }
  }
  return points;
}

function parseOneMap(id: string, map: GMap, geometry: GGeometry | undefined): ParsedMap {
  const doors: ParsedDoor[] = [];
  for (const raw of map.doors || []) {
    const parsed = doorTuple(raw);
    if (!parsed) {
      continue;
    }
    parsed.fromMap = id;
    doors.push(parsed);
  }

  const spawns: PointFeature[] = [];
  const spawnList = map.spawns || [];
  for (let i = 0; i < spawnList.length; i += 1) {
    const spawn = spawnList[i];
    spawns.push({ x: spawn[0], y: spawn[1], label: `${i}` });
  }

  const quirks: ParsedMap["quirks"] = [];
  for (const quirk of map.quirks || []) {
    quirks.push({
      x: quirk[0],
      y: quirk[1],
      width: quirk[2],
      height: quirk[3],
      kind: quirk[4],
      text: typeof quirk[5] === "string" ? quirk[5] : undefined,
    });
  }

  const monsters: ParsedMap["monsters"] = [];
  for (const monster of map.monsters || []) {
    if (monster.boundary) {
      const [x1, y1, x2, y2] = monster.boundary;
      monsters.push({
        type: monster.type,
        x: (x1 + x2) / 2,
        y: (y1 + y2) / 2,
        width: Math.abs(x2 - x1),
        height: Math.abs(y2 - y1),
      });
    } else if (monster.polygon) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [px, py] of monster.polygon) {
        [minX, minY, maxX, maxY] = expandBounds(minX, minY, maxX, maxY, px, py);
      }
      monsters.push({
        type: monster.type,
        x: (minX + maxX) / 2,
        y: (minY + maxY) / 2,
        width: maxX - minX,
        height: maxY - minY,
        polygon: monster.polygon,
      });
    } else if (monster.position) {
      monsters.push({
        type: monster.type,
        x: monster.position[0],
        y: monster.position[1],
        width: monster.radius ? monster.radius * 2 : 24,
        height: monster.radius ? monster.radius * 2 : 24,
        radius: monster.radius,
      });
    }
  }

  const zones: ParsedMap["zones"] = [];
  for (const zone of map.zones || []) {
    zones.push({ type: zone.type, polygon: zone.polygon });
  }

  const npcs = npcPoints(map);
  const xLines = geometry?.x_lines ? [...geometry.x_lines] : [];
  const yLines = geometry?.y_lines ? [...geometry.y_lines] : [];

  let minX = geometry?.min_x ?? Infinity;
  let minY = geometry?.min_y ?? Infinity;
  let maxX = geometry?.max_x ?? -Infinity;
  let maxY = geometry?.max_y ?? -Infinity;

  const bump = (x: number, y: number) => {
    [minX, minY, maxX, maxY] = expandBounds(minX, minY, maxX, maxY, x, y);
  };

  for (const door of doors) {
    bump(door.x, door.y);
  }
  for (const spawn of spawns) {
    bump(spawn.x, spawn.y);
  }
  for (const npc of npcs) {
    bump(npc.x, npc.y);
  }
  for (const quirk of quirks) {
    bump(quirk.x, quirk.y);
  }
  for (const monster of monsters) {
    bump(monster.x, monster.y);
  }

  if (!Number.isFinite(minX)) {
    minX = -100;
    minY = -100;
    maxX = 100;
    maxY = 100;
  }

  return {
    id,
    name: map.name || id,
    ignore: Boolean(map.ignore || map.unlist),
    outside: Boolean(map.outside),
    band: mapBand(id, map),
    minX,
    maxX,
    minY,
    maxY,
    xLines,
    yLines,
    doors,
    spawns,
    quirks,
    npcs,
    monsters,
    zones,
  };
}

export function parseMaps(source: MapSource, includeIgnored = false): Record<string, ParsedMap> {
  const parsed: Record<string, ParsedMap> = {};
  for (const [id, map] of Object.entries(source.maps)) {
    if (!map || !includeMap(map, includeIgnored)) {
      continue;
    }
    parsed[id] = parseOneMap(id, map, source.geometry[id]);
  }
  return parsed;
}

export function spawnPoint(
  maps: Record<string, ParsedMap>,
  mapId: string,
  spawnIndex: number,
): { x: number; y: number } | null {
  const map = maps[mapId];
  if (!map) {
    return null;
  }
  const spawn = map.spawns[spawnIndex];
  if (!spawn) {
    return null;
  }
  return { x: spawn.x, y: spawn.y };
}
