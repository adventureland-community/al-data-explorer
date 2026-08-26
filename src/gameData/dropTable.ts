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

/** Sum of numeric weights in a named exchange / nested open table. */
export function tableTotalWeight(entries: unknown[]): number {
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

/** Parse one Drop Table entry (bare key or probability tuple). */
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

/**
 * Acquisition projection: expand nested `open` into leaf item odds
 * (openChance × weight/Σ). Drop Simulation keeps `open` deferred until roll.
 */
export function expandOpenForAcquisition(
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

/** Item Acquisition view of all Drop Tables (opens expanded to leaves). */
export function toAcquisitionDropSources(drops: Record<string, unknown>): DropSource[] {
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
            rows.push(
              ...expandOpenForAcquisition("map", mapKey, row.probability, row.nestedTable, drops),
            );
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
              ...expandOpenForAcquisition(
                "monster",
                monsterKey,
                row.probability,
                row.nestedTable,
                drops,
              ),
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
  for (const row of toAcquisitionDropSources(drops)) {
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
