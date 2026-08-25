import { ItemKey } from "typed-adventureland";

import { DropSource, DropSourceType } from "./types";

type DropTuple = [number, string, ...unknown[]];

/** Named exchange / loot tables roll weight / sum(weights). Monster/map rolls are absolute. */
export type DropChanceKind = "absolute" | "weighted";

function toInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  return null;
}

function tableTotalWeight(entries: unknown[]): number {
  let total = 0;
  for (const entry of entries) {
    if (Array.isArray(entry) && typeof entry[0] === "number" && Number.isFinite(entry[0])) {
      total += entry[0];
    }
  }
  return total;
}

/**
 * Resolve a raw table weight to an absolute chance.
 * Grounded in adventureland_mongodb main node/server_functions.js exchange roll
 * and js/html.js render_drop: (mult * weight) / total.
 */
export function resolveDisplayChance(
  raw: number | null | undefined,
  kind: DropChanceKind,
  tableTotal?: number,
): number | null {
  if (raw == null || !Number.isFinite(raw) || raw <= 0) return null;
  if (kind === "absolute") return raw;
  const total = tableTotal ?? 0;
  if (total <= 0) return null;
  return raw / total;
}

function parseDropTuple(
  sourceType: DropSourceType,
  sourceKey: string,
  tuple: DropTuple,
  probability: number | null,
): DropSource[] {
  const [, second, third, fourth] = tuple;
  if (second === "open" && typeof third === "string") {
    return [
      {
        sourceType,
        sourceKey,
        itemKey: "",
        probability,
        quantity: null,
        title: "",
        nestedTable: third,
      },
    ];
  }
  return [
    {
      sourceType,
      sourceKey,
      itemKey: second,
      probability,
      quantity: toInt(third),
      title: typeof fourth === "string" ? fourth : typeof third === "string" ? third : "",
      nestedTable: "",
    },
  ];
}

/** Parse one drop table entry (bare key or probability tuple). Absolute chance semantics. */
export function parseDropEntry(
  sourceType: DropSourceType,
  sourceKey: string,
  entry: unknown,
  chanceKind: DropChanceKind = "absolute",
  tableTotal?: number,
): DropSource[] {
  if (typeof entry === "string") {
    return [
      {
        sourceType,
        sourceKey,
        itemKey: entry,
        probability: null,
        quantity: null,
        title: "",
        nestedTable: "",
      },
    ];
  }
  if (Array.isArray(entry) && entry.length >= 2 && typeof entry[0] === "number") {
    const raw = entry[0] as number;
    const probability = resolveDisplayChance(raw, chanceKind, tableTotal);
    return parseDropTuple(sourceType, sourceKey, entry as DropTuple, probability);
  }
  return [];
}

function expandOpenTable(
  sourceType: DropSourceType,
  sourceKey: string,
  openChance: number,
  nestedTable: string,
  drops: Record<string, unknown>,
): DropSource[] {
  const nested = drops[nestedTable];
  if (!Array.isArray(nested)) return [];
  const total = tableTotalWeight(nested);
  if (total <= 0) return [];
  const rows: DropSource[] = [];
  for (const entry of nested) {
    const parsed = parseDropEntry("table", nestedTable, entry, "weighted", total);
    for (const row of parsed) {
      if (!row.itemKey || row.probability == null) continue;
      rows.push({
        sourceType,
        sourceKey,
        itemKey: row.itemKey,
        probability: openChance * row.probability,
        quantity: row.quantity,
        title: row.title,
        nestedTable: "",
      });
    }
  }
  return rows;
}

export function extractDropRates(drops: Record<string, unknown>): DropSource[] {
  const rows: DropSource[] = [];

  const gold = drops.gold as Record<string, number> | undefined;
  if (gold) {
    for (const [key, value] of Object.entries(gold)) {
      rows.push({
        sourceType: "gold",
        sourceKey: key,
        itemKey: "",
        probability: value,
        quantity: null,
        title: "",
        nestedTable: "",
      });
    }
  }

  const maps = drops.maps as Record<string, unknown[]> | undefined;
  if (maps) {
    for (const [mapKey, entries] of Object.entries(maps)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const parsed = parseDropEntry("map", mapKey, entry, "absolute");
        for (const row of parsed) {
          if (row.nestedTable && row.probability != null) {
            rows.push(...expandOpenTable("map", mapKey, row.probability, row.nestedTable, drops));
          } else {
            rows.push(row);
          }
        }
      }
    }
  }

  const monsters = drops.monsters as Record<string, unknown[]> | undefined;
  if (monsters) {
    for (const [monsterKey, entries] of Object.entries(monsters)) {
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        const parsed = parseDropEntry("monster", monsterKey, entry, "absolute");
        for (const row of parsed) {
          if (row.nestedTable && row.probability != null) {
            rows.push(
              ...expandOpenTable("monster", monsterKey, row.probability, row.nestedTable, drops),
            );
          } else {
            rows.push(row);
          }
        }
      }
    }
  }

  for (const [tableKey, value] of Object.entries(drops)) {
    if (
      tableKey === "gold" ||
      tableKey === "maps" ||
      tableKey === "monsters" ||
      tableKey === "monsters_home_server"
    ) {
      continue;
    }
    if (!Array.isArray(value)) continue;
    const total = tableTotalWeight(value);
    for (const entry of value) {
      rows.push(...parseDropEntry("table", tableKey, entry, "weighted", total));
    }
  }

  return rows;
}

export function buildDropsByItem(drops: Record<string, unknown>): Map<ItemKey, DropSource[]> {
  const byItem = new Map<ItemKey, DropSource[]>();
  for (const row of extractDropRates(drops)) {
    if (!row.itemKey) continue;
    const key = row.itemKey as ItemKey;
    const list = byItem.get(key) ?? [];
    list.push(row);
    byItem.set(key, list);
  }
  for (const [, list] of byItem) {
    list.sort((a, b) => (b.probability ?? 0) - (a.probability ?? 0));
  }
  return byItem;
}

/**
 * Monster/map drop arrays are `[gold_or_meta, ...entries]`.
 * Entries are bare item keys (guaranteed) or `[probability, itemKey, ...]`.
 */
export function parseMonsterDropTable(
  monsterKey: string,
  raw: unknown[] | undefined,
): DropSource[] {
  if (!raw || raw.length <= 1) return [];
  const result: DropSource[] = [];
  for (let i = 1; i < raw.length; i += 1) {
    result.push(...parseDropEntry("monster", monsterKey, raw[i], "absolute"));
  }
  return result;
}

/** Prefer monster/map drops; push debug loot tables last. */
export function dropSourceSortKey(sourceType: string, sourceKey: string): number {
  const debugTables = new Set(["glitch", "lglitch", "test", "dev"]);
  if (sourceType === "monster") return 0;
  if (sourceType === "map") return 1;
  if (sourceType === "gold") return 2;
  if (sourceType === "table" && debugTables.has(sourceKey)) return 9;
  if (sourceType === "table") return 3;
  return 5;
}

export function sortDropSources(drops: DropSource[]): DropSource[] {
  return [...drops].sort((a, b) => {
    const rankA = dropSourceSortKey(a.sourceType, a.sourceKey);
    const rankB = dropSourceSortKey(b.sourceType, b.sourceKey);
    if (rankA !== rankB) return rankA - rankB;
    return (b.probability ?? 0) - (a.probability ?? 0);
  });
}

/** Format like in-game: chance ≥ 1 is guaranteed rolls ("N / 1"), else a percent or "1 in N". */
export function formatDropProbability(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1) {
    const pretty = Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
    return `${pretty} / 1`;
  }
  if (value >= 0.01) return `${(value * 100).toFixed(2)}%`;
  if (value >= 0.0001) return `${(value * 100).toFixed(4)}%`;
  // Rarer than 0.01%: "1 in N" is clearer than scientific notation.
  const oneIn = Math.max(1, Math.round(1 / value));
  return `1 in ${oneIn.toLocaleString("en-US")}`;
}

export function formatMergedDropOdds(probs: number[]): string {
  if (probs.length === 0) return "—";
  const guaranteed = probs.filter((p) => p >= 1);
  const chances = probs.filter((p) => p < 1);
  const parts: string[] = [];
  if (guaranteed.length > 0) {
    const sum = guaranteed.reduce((a, b) => a + b, 0);
    parts.push(formatDropProbability(sum));
  }
  for (const chance of chances) {
    parts.push(formatDropProbability(chance));
  }
  return parts.join(" · ");
}

/**
 * Merge repeated drops from the same source (e.g. Dragold's multiple essence rolls)
 * into one row. Guaranteed rolls (≥1) are summed; fractional chances stay listed.
 */
export function mergeDropSources(drops: DropSource[]): Array<DropSource & { oddsLabel: string }> {
  const groups = new Map<string, DropSource[]>();
  for (const drop of drops) {
    const id = `${drop.sourceType}\0${drop.sourceKey}\0${drop.itemKey}`;
    const list = groups.get(id) ?? [];
    list.push(drop);
    groups.set(id, list);
  }

  const merged: Array<DropSource & { oddsLabel: string }> = [];
  for (const list of groups.values()) {
    const base = list[0]!;
    const probs = list
      .map((d) => d.probability)
      .filter((p): p is number => p != null && Number.isFinite(p));
    merged.push({
      ...base,
      probability: probs.length > 0 ? probs.reduce((a, b) => a + b, 0) : base.probability,
      oddsLabel: formatMergedDropOdds(probs),
    });
  }
  return merged;
}

/** Sort then merge — canonical prep for detail lists. */
export function prepareDropSourcesForDisplay(
  drops: DropSource[],
): Array<DropSource & { oddsLabel: string }> {
  return mergeDropSources(sortDropSources(drops));
}

/** Format monster drop list for Monsters table display. */
export function formatMonsterDropsDisplay(drops: unknown): string {
  if (!Array.isArray(drops)) {
    return typeof drops === "object" ? JSON.stringify(drops) : String(drops ?? "");
  }
  return parseMonsterDropTable("", drops)
    .map((row) => {
      const name = row.nestedTable || row.itemKey;
      if (!name) return "";
      if (row.probability == null) return name;
      return `${name} (${formatDropProbability(row.probability)})`;
    })
    .filter(Boolean)
    .join(", ");
}

export function getDropSourceLink(
  drop: DropSource,
  items?: Record<string, unknown>,
): string | undefined {
  if (drop.sourceType === "monster") {
    return `/monsters?monster=${encodeURIComponent(drop.sourceKey)}`;
  }
  if (drop.sourceType === "map") {
    return `/world#map=${encodeURIComponent(drop.sourceKey)}`;
  }
  if (drop.sourceType === "table" && items?.[drop.sourceKey]) {
    return `/items/${encodeURIComponent(drop.sourceKey)}`;
  }
  return undefined;
}

/** Prefer the human map name from G.maps when available. */
export function getMapDisplayName(
  mapKey: string,
  maps?: Record<string, { name?: string } | undefined>,
): string {
  return maps?.[mapKey]?.name ?? mapKey;
}
