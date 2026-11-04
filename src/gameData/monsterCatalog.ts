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

export type MonsterFactRow = {
  key: string;
  label: string;
  value: string;
  href?: string;
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

export type MonsterAbilityRow = {
  key: string;
  summary: string;
};

export type MonsterSlotRow = {
  slot: string;
  itemKey: string;
  itemName: string;
  level: number | null;
  href: string;
};

export type MonsterChildSpawnRow = {
  interval: number;
  monsterKey: string;
  monsterName: string;
  href: string;
};

export type MonsterCbuffRow = {
  chance: number;
  condition: string;
};

export type MonsterStatusRow = {
  key: string;
  summary: string;
};

export type MonsterPetView = {
  xp: number | null;
  exponential: boolean;
  brightness: number | null;
  levelStats: MonsterStatRow[];
  ranges: MonsterFactRow[];
};

export type MonsterDetailView = {
  key: string;
  name: string;
  skin: string;
  chargeSkin: string | null;
  damageType: string | null;
  explanation: string | null;
  stats: MonsterStatRow[];
  facts: MonsterFactRow[];
  flags: string[];
  abilities: MonsterAbilityRow[];
  slots: MonsterSlotRow[];
  childSpawns: MonsterChildSpawnRow[];
  cbuffs: MonsterCbuffRow[];
  statuses: MonsterStatusRow[];
  pet: MonsterPetView | null;
  other: MonsterFactRow[];
  spawns: MonsterSpawnRow[];
  drops: MonsterDropRow[];
  homeDrops: MonsterDropRow[];
  goldByMap: MonsterGoldRow[];
  achievements: MonsterAchievementRow[];
  worldHref: string | null;
  dropsSimHref: string;
};

/** Prefer this order for the main combat stats table. */
const PRIMARY_STAT_ORDER: ReadonlyArray<[string, string]> = [
  ["hp", "HP"],
  ["mp", "MP"],
  ["xp", "XP"],
  ["attack", "Attack"],
  ["frequency", "Frequency"],
  ["speed", "Speed"],
  ["range", "Range"],
  ["armor", "Armor"],
  ["resistance", "Resistance"],
  ["phresistance", "Physical res."],
  ["evasion", "Evasion"],
  ["avoidance", "Avoidance"],
  ["reflection", "Reflection"],
  ["dreturn", "Damage return"],
  ["crit", "Crit"],
  ["apiercing", "Armor pierce"],
  ["rpiercing", "Res. pierce"],
  ["lifesteal", "Lifesteal"],
  ["goldsteal", "Gold steal"],
  ["explosion", "Explosion"],
  ["aa", "AA"],
  ["respawn", "Respawn"],
  ["aggro", "Aggro"],
  ["rage", "Rage"],
  ["charge", "Charge"],
  ["size", "Size"],
  ["difficulty", "Difficulty"],
  ["orientation", "Orientation"],
];

const FLAG_LABELS: Record<string, string> = {
  "1hp": "1 HP",
  poisonous: "Poisonous",
  cooperative: "Cooperative",
  cute: "Cute",
  stationary: "Stationary",
  passive: "Passive",
  peaceful: "Peaceful",
  global: "Global",
  hide: "Hide",
  immune: "Immune",
  humanoid: "Humanoid",
  operator: "Operator",
  escapist: "Escapist",
  drop_on_hit: "Drop on hit",
  roam: "Roam",
  special: "Special",
  supporter: "Supporter",
  trap: "Trap",
  unlist: "Unlisted",
};

const FACT_LABELS: Record<string, string> = {
  damage_type: "Damage type",
  projectile: "Projectile",
  hit: "Hit FX",
  announce: "Announce",
  balance: "Balance",
  prefix: "Prefix",
  rbuff: "Rage buff",
  respawn_as: "Respawn as",
  charge_skin: "Charge skin",
  explanation: "Explanation",
};

/** Identity / structured fields handled outside the generic walker. */
const HANDLED_KEYS = new Set([
  "name",
  "skin",
  "charge_skin",
  "damage_type",
  "explanation",
  "achievements",
  "abilities",
  "slots",
  "spawns",
  "cbuff",
  "s",
  "pet",
  ...PRIMARY_STAT_ORDER.map(([key]) => key),
  ...Object.keys(FLAG_LABELS),
  ...Object.keys(FACT_LABELS),
]);

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

function humanizeKey(key: string): string {
  return key.replace(/_/g, " ");
}

function formatUnknownValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return formatStatNumber(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function summarizeObject(value: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, entry] of Object.entries(value)) {
    if (entry == null) continue;
    if (typeof entry === "boolean") {
      if (entry) parts.push(key);
      continue;
    }
    if (typeof entry === "number" || typeof entry === "string") {
      parts.push(`${key} ${entry}`);
      continue;
    }
    parts.push(`${key}=${formatUnknownValue(entry)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : "{}";
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

function abilityRows(raw: unknown): MonsterAbilityRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const rows: MonsterAbilityRow[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    rows.push({
      key,
      summary:
        value && typeof value === "object" && !Array.isArray(value)
          ? summarizeObject(value as Record<string, unknown>)
          : formatUnknownValue(value),
    });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows;
}

function slotRows(
  raw: unknown,
  items: Record<string, { name?: string } | undefined>,
): MonsterSlotRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const rows: MonsterSlotRow[] = [];
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const entry = value as { name?: unknown; level?: unknown };
    if (typeof entry.name !== "string" || !entry.name) continue;
    const itemKey = entry.name;
    const level =
      typeof entry.level === "number" && Number.isFinite(entry.level) ? entry.level : null;
    rows.push({
      slot,
      itemKey,
      itemName: items[itemKey]?.name ?? itemKey,
      level,
      href: `/items/${encodeURIComponent(itemKey)}`,
    });
  }
  rows.sort((a, b) => a.slot.localeCompare(b.slot));
  return rows;
}

function childSpawnRows(
  raw: unknown,
  monsters: Record<string, GMonster | undefined>,
): MonsterChildSpawnRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: MonsterChildSpawnRow[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const interval = Number(entry[0]);
    const monsterKey = String(entry[1] ?? "");
    if (!Number.isFinite(interval) || !monsterKey) continue;
    rows.push({
      interval,
      monsterKey,
      monsterName: monsters[monsterKey]?.name ?? monsterKey,
      href: monsterDetailHref(monsterKey),
    });
  }
  return rows;
}

function cbuffRows(raw: unknown): MonsterCbuffRow[] {
  if (!Array.isArray(raw)) return [];
  const rows: MonsterCbuffRow[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const chance = Number(entry[0]);
    const condition = String(entry[1] ?? "");
    if (!Number.isFinite(chance) || !condition) continue;
    rows.push({ chance, condition });
  }
  return rows;
}

function statusRows(raw: unknown): MonsterStatusRow[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];
  const rows: MonsterStatusRow[] = [];
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    rows.push({
      key,
      summary:
        value && typeof value === "object" && !Array.isArray(value)
          ? summarizeObject(value as Record<string, unknown>)
          : formatUnknownValue(value),
    });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows;
}

function petView(raw: unknown): MonsterPetView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const pet = raw as Record<string, unknown>;
  const levelStats: MonsterStatRow[] = [];
  const { level } = pet;
  if (level && typeof level === "object" && !Array.isArray(level)) {
    for (const [key, value] of Object.entries(level as Record<string, unknown>)) {
      if (typeof value !== "number" || !Number.isFinite(value)) continue;
      levelStats.push({ key, label: humanizeKey(key), value: formatStatNumber(value) });
    }
  }
  const ranges: MonsterFactRow[] = [];
  for (const [key, value] of Object.entries(pet)) {
    if (key === "level" || key === "xp" || key === "exponential" || key === "brightness") continue;
    if (Array.isArray(value) && value.length === 2) {
      ranges.push({
        key,
        label: humanizeKey(key),
        value: `${formatUnknownValue(value[0])}–${formatUnknownValue(value[1])}`,
      });
      continue;
    }
    ranges.push({ key, label: humanizeKey(key), value: formatUnknownValue(value) });
  }
  return {
    xp: typeof pet.xp === "number" && Number.isFinite(pet.xp) ? pet.xp : null,
    exponential: Boolean(pet.exponential),
    brightness:
      typeof pet.brightness === "number" && Number.isFinite(pet.brightness) ? pet.brightness : null,
    levelStats,
    ranges,
  };
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

function extractMonsterFields(
  monster: GMonster,
  monsters: Record<string, GMonster | undefined>,
  items: Record<string, { name?: string } | undefined>,
): Pick<
  MonsterDetailView,
  | "stats"
  | "facts"
  | "flags"
  | "abilities"
  | "slots"
  | "childSpawns"
  | "cbuffs"
  | "statuses"
  | "pet"
  | "other"
  | "damageType"
  | "explanation"
  | "chargeSkin"
> {
  const record = monster as unknown as Record<string, unknown>;
  const stats: MonsterStatRow[] = [];
  for (const [key, label] of PRIMARY_STAT_ORDER) {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) continue;
    stats.push({ key, label, value: formatStatNumber(value) });
  }

  const flags: string[] = [];
  for (const [key, label] of Object.entries(FLAG_LABELS)) {
    if (record[key] === true) flags.push(label);
  }

  const facts: MonsterFactRow[] = [];
  const damageType = typeof record.damage_type === "string" ? record.damage_type : null;
  const explanation =
    typeof record.explanation === "string" && record.explanation.trim() ? record.explanation : null;
  const chargeSkin =
    typeof record.charge_skin === "string" && record.charge_skin.trim() ? record.charge_skin : null;

  for (const [key, label] of Object.entries(FACT_LABELS)) {
    if (key === "damage_type" || key === "explanation" || key === "charge_skin") continue;
    const value = record[key];
    if (value == null || value === "") continue;
    const fact: MonsterFactRow = { key, label, value: formatUnknownValue(value) };
    if (key === "respawn_as" && typeof value === "string" && monsters[value]) {
      fact.href = monsterDetailHref(value);
      fact.value = monsters[value]?.name ?? value;
    }
    facts.push(fact);
  }

  const other: MonsterFactRow[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (HANDLED_KEYS.has(key)) continue;
    if (value == null) continue;
    other.push({ key, label: humanizeKey(key), value: formatUnknownValue(value) });
  }
  other.sort((a, b) => a.key.localeCompare(b.key));

  return {
    stats,
    facts,
    flags,
    abilities: abilityRows(record.abilities),
    slots: slotRows(record.slots, items),
    childSpawns: childSpawnRows(record.spawns, monsters),
    cbuffs: cbuffRows(record.cbuff),
    statuses: statusRows(record.s),
    pet: petView(record.pet),
    other,
    damageType,
    explanation,
    chargeSkin,
  };
}

export function getMonsterDetail(monsterKey: string, G: CustomGData): MonsterDetailView | null {
  const monsters = asMonsters(G.monsters);
  const monster = monsters[monsterKey];
  if (!monster) return null;

  const items = asItems(G.items);
  const maps = G.maps as Record<string, { name?: string } | undefined>;
  const spawns = listMonsterSpawns(monsterKey, G);
  const fields = extractMonsterFields(monster, monsters, items);

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
    ...fields,
    spawns,
    drops: dropRowsFromSources(regular, items, false),
    homeDrops: dropRowsFromSources(home, items, true),
    goldByMap,
    achievements: achievementRows(monster.achievements),
    worldHref: monsterWorldHref(spawns),
    dropsSimHref: `/drops?monster=${encodeURIComponent(monsterKey)}`,
  };
}
