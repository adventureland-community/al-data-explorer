import { GGeometry, GMap, GNpc } from "typed-adventureland";
import { packCountValue } from "./packSpriteSlots";
import {
  MapBand,
  MapSource,
  NpcFeature,
  ParsedDoor,
  ParsedMap,
  SpawnFeature,
  SpawnLink,
} from "./types";

const UNDERGROUND_PATTERN = /cave|cove|tunnel|crypt|tomb|level|bank_b|bank_u|dungeon|mtunnel/i;

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

function mapExit(exit: [string, number] | undefined): ParsedMap["onDeath"] {
  if (!exit || typeof exit[1] !== "number") {
    return undefined;
  }
  return { map: String(exit[0]), spawn: exit[1] };
}

function pushSpawnLink(list: SpawnLink[], link: SpawnLink): void {
  for (const existing of list) {
    if (existing.kind === link.kind && existing.label === link.label) {
      return;
    }
  }
  list.push(link);
}

function annotateSpawnLinks(
  parsed: Record<string, ParsedMap>,
  npcDefs: Record<string, GNpc>,
): void {
  for (const map of Object.values(parsed)) {
    if (map.spawns[0]) {
      pushSpawnLink(map.spawns[0].arrivals, { kind: "town", label: "Town skill location" });
    }
    for (const door of map.doors) {
      const dest = parsed[door.toMap]?.spawns[door.destSpawn];
      if (dest) {
        pushSpawnLink(dest.arrivals, { kind: "door", label: map.name || map.id });
      }
      if (typeof door.sourceSpawn === "number") {
        const source = map.spawns[door.sourceSpawn];
        const destName = parsed[door.toMap]?.name || door.toMap;
        if (source) {
          pushSpawnLink(source.departures, { kind: "door", label: destName });
        }
      }
    }
    if (map.onDeath) {
      const dest = parsed[map.onDeath.map]?.spawns[map.onDeath.spawn];
      if (dest) {
        pushSpawnLink(dest.arrivals, { kind: "death", label: `Death from ${map.name || map.id}` });
      }
    }
    if (map.onExit) {
      const dest = parsed[map.onExit.map]?.spawns[map.onExit.spawn];
      if (dest) {
        pushSpawnLink(dest.arrivals, { kind: "exit", label: `Exit from ${map.name || map.id}` });
      }
    }
  }
  for (const npc of Object.values(npcDefs)) {
    const places = npc.places as Record<string, number> | undefined;
    if (!places) {
      continue;
    }
    const label = npc.name || npc.id || "Transporter";
    for (const [mapId, spawnIndex] of Object.entries(places)) {
      const dest = parsed[mapId]?.spawns[spawnIndex];
      if (dest) {
        pushSpawnLink(dest.arrivals, { kind: "transporter", label });
      }
    }
  }
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

function boxRect(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: (x1 + x2) / 2,
    y: (y1 + y2) / 2,
    width: Math.abs(x2 - x1),
    height: Math.abs(y2 - y1),
  };
}

function npcRoam(npc: GMap["npcs"][number]): NpcFeature["roam"] {
  if (!npc.boundary) {
    return undefined;
  }
  return boxRect(npc.boundary[0], npc.boundary[1], npc.boundary[2], npc.boundary[3]);
}

function npcPoints(map: GMap, npcDefs: Record<string, GNpc>): NpcFeature[] {
  const points: NpcFeature[] = [];
  for (const npc of map.npcs || []) {
    const def = npcDefs[npc.id];
    const skin = def?.skin || npc.id;
    const label = npc.name || def?.name || npc.id;
    const name = npc.name || def?.name;
    const roam = npcRoam(npc);
    const moving = Boolean(def?.moving);
    if (npc.position) {
      points.push({
        id: npc.id,
        skin,
        name,
        roam,
        moving,
        x: npc.position[0],
        y: npc.position[1],
        label,
      });
    }
    if (npc.positions) {
      for (const position of npc.positions) {
        points.push({
          id: npc.id,
          skin,
          name,
          roam,
          moving,
          x: position[0],
          y: position[1],
          label,
        });
      }
    }
  }
  return points;
}

function localExtraBounds(
  mapId: string,
  monster: NonNullable<GMap["monsters"]>[number],
): ParsedMap["monsters"][number]["extraBounds"] {
  const extras: NonNullable<ParsedMap["monsters"][number]["extraBounds"]> = [];
  for (const bound of monster.boundaries || []) {
    if (bound[0] !== mapId) {
      continue;
    }
    extras.push(boxRect(bound[1], bound[2], bound[3], bound[4]));
  }
  return extras.length ? extras : undefined;
}

function rageBox(
  rage: [number, number, number, number] | undefined,
): ParsedMap["monsters"][number]["rage"] {
  if (!rage) {
    return undefined;
  }
  const rect = boxRect(rage[0], rage[1], rage[2], rage[3]);
  return { ...rect, width: rect.width + 6, height: rect.height + 6 };
}

function monsterPack(
  monster: NonNullable<GMap["monsters"]>[number],
  x: number,
  y: number,
  width: number,
  height: number,
  extra?: Pick<ParsedMap["monsters"][number], "radius" | "polygon" | "rage" | "extraBounds">,
): ParsedMap["monsters"][number] {
  return {
    type: monster.type,
    x,
    y,
    width,
    height,
    count: packCountValue(monster.count),
    grow: Boolean(monster.grow),
    roam: Boolean(monster.roam),
    ...extra,
  };
}

function parseOneMap(
  id: string,
  map: GMap,
  geometry: GGeometry | undefined,
  npcDefs: Record<string, GNpc>,
): ParsedMap {
  const doors: ParsedDoor[] = [];
  for (const raw of map.doors || []) {
    const parsed = doorTuple(raw);
    if (!parsed) {
      continue;
    }
    parsed.fromMap = id;
    doors.push(parsed);
  }

  const spawns: SpawnFeature[] = [];
  const spawnList = map.spawns || [];
  for (let i = 0; i < spawnList.length; i += 1) {
    const spawn = spawnList[i];
    const direction = spawn.length > 2 ? spawn[2] : undefined;
    const size = spawn.length > 3 ? spawn[3] : undefined;
    spawns.push({
      x: spawn[0],
      y: spawn[1],
      label: `${i}`,
      index: i,
      direction: typeof direction === "number" ? direction : undefined,
      size: typeof size === "number" ? size : undefined,
      arrivals: [],
      departures: [],
    });
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
    const extraBounds = localExtraBounds(id, monster);
    const rage = rageBox(monster.rage);
    if (monster.boundary) {
      const [x1, y1, x2, y2] = monster.boundary;
      monsters.push(
        monsterPack(monster, (x1 + x2) / 2, (y1 + y2) / 2, Math.abs(x2 - x1), Math.abs(y2 - y1), {
          extraBounds,
          rage,
        }),
      );
    } else if (monster.polygon) {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [px, py] of monster.polygon) {
        [minX, minY, maxX, maxY] = expandBounds(minX, minY, maxX, maxY, px, py);
      }
      monsters.push(
        monsterPack(monster, (minX + maxX) / 2, (minY + maxY) / 2, maxX - minX, maxY - minY, {
          polygon: monster.polygon,
          extraBounds,
          rage,
        }),
      );
    } else if (monster.position) {
      monsters.push(
        monsterPack(
          monster,
          monster.position[0],
          monster.position[1],
          monster.radius ? monster.radius * 2 : 24,
          monster.radius ? monster.radius * 2 : 24,
          { radius: monster.radius, extraBounds, rage },
        ),
      );
    } else if (extraBounds && extraBounds.length > 0) {
      for (const box of extraBounds) {
        monsters.push(
          monsterPack(monster, box.x, box.y, box.width, box.height, {
            rage,
          }),
        );
      }
    }
  }

  const zones: ParsedMap["zones"] = [];
  for (const zone of map.zones || []) {
    zones.push({ type: zone.type, polygon: zone.polygon });
  }

  const machines: ParsedMap["machines"] = [];
  for (const machine of map.machines || []) {
    const frame = machine.frames?.[0];
    machines.push({
      type: machine.type,
      x: machine.x,
      y: machine.y,
      width: frame ? frame[2] : 32,
      height: frame ? frame[3] : 40,
    });
  }

  const animatables: ParsedMap["animatables"] = [];
  for (const [key, data] of Object.entries(map.animatables || {})) {
    if (!data || typeof data.x !== "number" || typeof data.y !== "number") {
      continue;
    }
    animatables.push({
      id: key,
      x: data.x,
      y: data.y,
      position: String(data.position || key),
      label: key,
    });
  }

  const traps: ParsedMap["traps"] = [];
  for (const trap of map.traps || []) {
    traps.push({
      type: trap.type,
      x: trap.position?.[0] ?? 0,
      y: trap.position?.[1] ?? 0,
      polygon: trap.polygon ? [...trap.polygon] : undefined,
    });
  }

  const npcs = npcPoints(map, npcDefs);
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
  for (const machine of machines) {
    bump(machine.x, machine.y);
  }
  for (const animatable of animatables) {
    bump(animatable.x, animatable.y);
  }
  for (const trap of traps) {
    bump(trap.x, trap.y);
  }

  if (!Number.isFinite(minX)) {
    minX = -100;
    minY = -100;
    maxX = 100;
    maxY = 100;
  }

  const artMinX = geometry?.min_x ?? minX;
  const artMaxX = geometry?.max_x ?? maxX;
  const artMinY = geometry?.min_y ?? minY;
  const artMaxY = geometry?.max_y ?? maxY;

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
    artMinX,
    artMaxX,
    artMinY,
    artMaxY,
    xLines,
    yLines,
    doors,
    spawns,
    quirks,
    npcs,
    monsters,
    zones,
    machines,
    animatables,
    traps,
    onDeath: mapExit(map.on_death),
    onExit: mapExit(map.on_exit),
    exitsToOverworld: false,
  };
}

function expandParsedMap(map: ParsedMap, x: number, y: number): void {
  map.minX = Math.min(map.minX, x);
  map.maxX = Math.max(map.maxX, x);
  map.minY = Math.min(map.minY, y);
  map.maxY = Math.max(map.maxY, y);
}

function packNear(map: ParsedMap, type: string, x: number, y: number): boolean {
  for (const pack of map.monsters) {
    if (pack.type === type && Math.abs(pack.x - x) < 0.5 && Math.abs(pack.y - y) < 0.5) {
      return true;
    }
  }
  return false;
}

/** Random-respawn lists live on one map; copy other-map boxes onto those maps. */
function distributeCrossMapBoundaries(parsed: Record<string, ParsedMap>, source: MapSource): void {
  for (const fromId of Object.keys(parsed)) {
    const gmap = source.maps[fromId];
    if (!gmap) {
      continue;
    }
    for (const monster of gmap.monsters || []) {
      if (!monster.boundaries) {
        continue;
      }
      for (const bound of monster.boundaries) {
        const targetId = String(bound[0]);
        if (targetId === fromId) {
          continue;
        }
        const target = parsed[targetId];
        if (!target) {
          continue;
        }
        const rect = boxRect(bound[1], bound[2], bound[3], bound[4]);
        if (packNear(target, monster.type, rect.x, rect.y)) {
          continue;
        }
        target.monsters.push(
          monsterPack(monster, rect.x, rect.y, rect.width, rect.height, {
            rage: rageBox(monster.rage),
          }),
        );
        expandParsedMap(target, rect.x, rect.y);
      }
    }
  }
}

export function parseMaps(
  source: MapSource,
  includeIgnored = false,
  npcDefs: Record<string, GNpc> = {},
): Record<string, ParsedMap> {
  const parsed: Record<string, ParsedMap> = {};
  for (const [id, map] of Object.entries(source.maps)) {
    if (!map || !includeMap(map, includeIgnored)) {
      continue;
    }
    parsed[id] = parseOneMap(id, map, source.geometry[id], npcDefs);
  }
  for (const map of Object.values(parsed)) {
    let exitsToOverworld = false;
    for (const door of map.doors) {
      if (parsed[door.toMap]?.band === "overworld") {
        exitsToOverworld = true;
        break;
      }
    }
    map.exitsToOverworld = exitsToOverworld;
  }
  distributeCrossMapBoundaries(parsed, source);
  annotateSpawnLinks(parsed, npcDefs);
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
