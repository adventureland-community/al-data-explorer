import type { GGeometry, GMap, GMonster, GNpc, ItemKey, MonsterKey } from "typed-adventureland";

import type { CustomGData } from "../GDataContext";
import { parseMaps } from "../WorldViewer/parseMaps";
import {
  formatDropProbability,
  getMapDisplayName,
  parseHomeServerDropTable,
  parseMonsterDropTable,
} from "./drops";
import { worldFocusHref } from "./mapTravel";
import type { DropSource } from "./types";

export function monsterDetailHref(monsterKey: string): string {
  return `/monsters/${encodeURIComponent(monsterKey)}`;
}

function mapHref(mapKey: string): string {
  return `/maps/${encodeURIComponent(mapKey)}`;
}

export type MonsterStatRow = {
  key: string;
  label: string;
  value: string;
};

export type MonsterSpawnZone = {
  x: number;
  y: number;
  width: number;
  height: number;
  count: number;
  grow: boolean;
  roam: boolean;
};

export type MonsterSpawnRow = {
  mapKey: string;
  mapName: string;
  href: string;
  worldHref: string;
  zones: MonsterSpawnZone[];
};

export type MonsterDropRow = {
  itemKey: string;
  label: string;
  href: string | null;
  oddsLabel: string;
  title: string;
  data: string;
  nestedTable: string;
  homeServer: boolean;
};

export type MonsterGoldRow = {
  mapKey: string;
  mapName: string;
  gold: number;
  href: string;
};

export type MonsterAchievementRow = {
  kills: number;
  kind: string;
  reward: string;
};

export type MonsterDetailView = {
  key: string;
  name: string;
  skin: string;
  damageType: string | null;
  stats: MonsterStatRow[];
  flags: string[];
  spawns: MonsterSpawnRow[];
  drops: MonsterDropRow[];
  homeDrops: MonsterDropRow[];
  goldByMap: MonsterGoldRow[];
  achievements: MonsterAchievementRow[];
  worldHref: string | null;
  dropsSimHref: string;
};

function asMonsters(monsters: CustomGData["monsters"]): Record<string, GMonster | undefined> {
  return monsters as unknown as Record<string, GMonster | undefined>;
}

function asItems(items: CustomGData["items"]): Record<string, { name?: string } | undefined> {
  return items as unknown as Record<string, { name?: string } | undefined>;
}

function formatStatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 10000) return value.toLocaleString("en-US");
  if (Number.isInteger(value)) return String(value);
  return String(Number(value.toFixed(4)));
}

function pushStat(rows: MonsterStatRow[], key: string, label: string, value: unknown): void {
  if (typeof value !== "number" || !Number.isFinite(value)) return;
  rows.push({ key, label, value: formatStatNumber(value) });
}

function dropRowsFromSources(
  sources: DropSource[],
  items: Record<string, { name?: string } | undefined>,
  homeServer: boolean,
): MonsterDropRow[] {
  const rows: MonsterDropRow[] = [];
  for (const drop of sources) {
    const itemKey = drop.nestedTable || drop.itemKey;
    if (!itemKey) continue;
    const label = drop.nestedTable ? `open → ${drop.nestedTable}` : items[itemKey]?.name ?? itemKey;
    const href = drop.nestedTable
      ? `/drops?mode=exchange&table=${encodeURIComponent(drop.nestedTable)}`
      : items[itemKey]
      ? `/items/${encodeURIComponent(itemKey as ItemKey)}`
      : null;
    rows.push({
      itemKey,
      label,
      href,
      oddsLabel: drop.probability != null ? formatDropProbability(drop.probability) : "guaranteed",
      title: drop.title,
      data: drop.data,
      nestedTable: drop.nestedTable,
      homeServer,
    });
  }
  return rows;
}

function achievementRows(raw: unknown): MonsterAchievementRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: MonsterAchievementRow[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 4) continue;
    const kills = Number(entry[0]);
    const kind = String(entry[1] ?? "");
    const rewardKey = String(entry[2] ?? "");
    const rewardValue = entry[3];
    if (!Number.isFinite(kills) || !rewardKey) continue;
    rows.push({
      kills,
      kind,
      reward: `${rewardKey} ${rewardValue}`,
    });
  }
  return rows;
}

/** Deep link into World viewer focused on the first spawn map / zone. */
export function monsterWorldHref(
  spawns: readonly Pick<MonsterSpawnRow, "mapKey" | "zones">[],
): string | null {
  const first = spawns[0];
  if (!first) return null;
  const zone = first.zones[0];
  if (zone) return worldFocusHref(first.mapKey, zone.x, zone.y);
  return worldFocusHref(first.mapKey);
}

/** Spawn packs for one monster type, including cross-map `boundaries` copies. */
export function listMonsterSpawns(monsterKey: string, G: CustomGData): MonsterSpawnRow[] {
  const maps = G.maps as unknown as Record<string, GMap>;
  const geometry = G.geometry as unknown as Record<string, GGeometry | undefined>;
  const npcDefs = G.npcs as unknown as Record<string, GNpc>;
  const parsed = parseMaps({ maps, geometry }, true, npcDefs);
  const byMap = new Map<string, MonsterSpawnZone[]>();

  for (const [mapKey, map] of Object.entries(parsed)) {
    for (const pack of map.monsters) {
      if (pack.type !== monsterKey) continue;
      const list = byMap.get(mapKey) ?? [];
      list.push({
        x: pack.x,
        y: pack.y,
        width: Math.max(1, pack.width),
        height: Math.max(1, pack.height),
        count: pack.count,
        grow: pack.grow,
        roam: Boolean(pack.roam),
      });
      byMap.set(mapKey, list);
    }
  }

  // Keep index maps even when geometry/parse missed a pack (name-only row).
  const indexed = G.indexes.spawnsByMonster.get(monsterKey as MonsterKey) ?? [];
  for (const mapKey of indexed) {
    if (!byMap.has(mapKey)) byMap.set(mapKey, []);
  }

  const mapNames = G.maps as Record<string, { name?: string } | undefined>;
  const rows: MonsterSpawnRow[] = [];
  for (const [mapKey, zones] of byMap) {
    rows.push({
      mapKey,
      mapName: getMapDisplayName(mapKey, mapNames),
      href: mapHref(mapKey),
      worldHref: zones[0] ? worldFocusHref(mapKey, zones[0].x, zones[0].y) : worldFocusHref(mapKey),
      zones,
    });
  }
  rows.sort((a, b) => a.mapName.localeCompare(b.mapName) || a.mapKey.localeCompare(b.mapKey));
  return rows;
}

export function getMonsterDetail(monsterKey: string, G: CustomGData): MonsterDetailView | null {
  const monster = asMonsters(G.monsters)[monsterKey];
  if (!monster) return null;

  const items = asItems(G.items);
  const maps = G.maps as Record<string, { name?: string } | undefined>;
  const spawns = listMonsterSpawns(monsterKey, G);

  const stats: MonsterStatRow[] = [];
  pushStat(stats, "hp", "HP", monster.hp);
  pushStat(stats, "mp", "MP", monster.mp);
  pushStat(stats, "xp", "XP", monster.xp);
  pushStat(stats, "attack", "Attack", monster.attack);
  pushStat(stats, "frequency", "Frequency", monster.frequency);
  pushStat(stats, "speed", "Speed", monster.speed);
  pushStat(stats, "range", "Range", monster.range);
  pushStat(stats, "armor", "Armor", monster.armor);
  pushStat(stats, "resistance", "Resistance", monster.resistance);
  pushStat(stats, "evasion", "Evasion", monster.evasion);
  pushStat(stats, "reflection", "Reflection", monster.reflection);
  pushStat(stats, "respawn", "Respawn", monster.respawn);
  pushStat(stats, "aggro", "Aggro", monster.aggro);
  pushStat(stats, "rage", "Rage", monster.rage);
  pushStat(stats, "charge", "Charge", monster.charge);

  const loose = monster as GMonster & {
    damage_type?: string;
    poisonous?: boolean;
    cooperative?: boolean;
    cute?: boolean;
    stationary?: boolean;
    announcable?: boolean;
  };

  const flags: string[] = [];
  if (loose.poisonous) flags.push("Poisonous");
  if (loose.cooperative) flags.push("Cooperative");
  if (loose.cute) flags.push("Cute");
  if (loose.stationary) flags.push("Stationary");

  const dropsBag = G.drops as
    | {
        monsters?: Record<string, unknown[] | undefined>;
        monsters_home_server?: Record<string, unknown[] | undefined>;
      }
    | undefined;
  const regular = parseMonsterDropTable(monsterKey, dropsBag?.monsters?.[monsterKey]);
  const home = parseHomeServerDropTable(monsterKey, dropsBag?.monsters_home_server?.[monsterKey]);

  const goldByMap: MonsterGoldRow[] = [];
  const baseGold = G.base_gold?.[monsterKey as keyof typeof G.base_gold] as
    | Record<string, number>
    | undefined;
  if (baseGold) {
    for (const [mapKey, gold] of Object.entries(baseGold)) {
      if (typeof gold !== "number" || !Number.isFinite(gold)) continue;
      goldByMap.push({
        mapKey,
        mapName: getMapDisplayName(mapKey, maps),
        gold,
        href: mapHref(mapKey),
      });
    }
    goldByMap.sort(
      (a, b) => a.mapName.localeCompare(b.mapName) || a.mapKey.localeCompare(b.mapKey),
    );
  }

  return {
    key: monsterKey,
    name: monster.name ?? monsterKey,
    skin: monster.skin ?? monsterKey,
    damageType: typeof loose.damage_type === "string" ? loose.damage_type : null,
    stats,
    flags,
    spawns,
    drops: dropRowsFromSources(regular, items, false),
    homeDrops: dropRowsFromSources(home, items, true),
    goldByMap,
    achievements: achievementRows(monster.achievements),
    worldHref: monsterWorldHref(spawns),
    dropsSimHref: `/drops?monster=${encodeURIComponent(monsterKey)}`,
  };
}
