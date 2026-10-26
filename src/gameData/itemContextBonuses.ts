import type { ClassKey, GItem } from "typed-adventureland";

import { CLASS_COLOR } from "../constants";
import { CLASS_KEYS, isClassKey, titleCaseKey, type ClassSlotBonus } from "./classSkills";
import { formatItemStatValue } from "./prettyNumbers";
import { STAT_DISPLAY_LABELS } from "./statLabels";

/** Label colors shared by context / class-slot modifier cards. */
export const CONTEXT_BONUS_LABEL_COLOR: Record<string, string> = {
  speed: "#5eead4",
  frequency: "#34d399",
  miss: "#f87171",
  mp_cost: "#60a5fa",
  output: "#f97316",
  apiercing: "#d4d4d8",
  crit: "#db2777",
  critdamage: "#be123c",
  evasion: "#7dd3fc",
  lifesteal: "#f472b6",
  gold: "#fbbf24",
  attack: "#316EE6",
  armor: "#d4d4d8",
  rpiercing: "#5eead4",
  int: "#93c5fd",
  str: "#fdba74",
  dex: "#a3e635",
};

export type ItemContextBonusKind = "class" | "map";

export type ItemContextBonusScope =
  | {
      kind: "class";
      classKey: ClassKey;
      label: string;
      href: string;
      color: string;
    }
  | {
      kind: "map";
      /** One or more maps that share an identical bonus object. */
      maps: { key: string; label: string; href: string }[];
    };

export type ItemContextBonusRow = {
  id: string;
  scope: ItemContextBonusScope;
  bonuses: ClassSlotBonus[];
  /** Nested `upgrade` deltas applied per item level when this context is active. */
  upgrade: ClassSlotBonus[];
  /** Nested `compound` deltas (rare on context blocks). */
  compound: ClassSlotBonus[];
};

export type ItemContextBonusLookups = {
  maps?: Record<string, { name?: string; ignore?: boolean } | undefined>;
};

function formatContextBonusValue(key: string, value: number): string {
  const formatted = formatItemStatValue(key, value);
  if (value > 0 && !formatted.startsWith("+") && !formatted.startsWith("-")) {
    return `+${formatted}`;
  }
  return formatted;
}

function bonusRowsFromRecord(record: Record<string, unknown> | undefined): ClassSlotBonus[] {
  if (!record) return [];
  const rows: ClassSlotBonus[] = [];
  for (const [key, value] of Object.entries(record)) {
    if (typeof value !== "number") continue;
    rows.push({
      key,
      label: STAT_DISPLAY_LABELS[key] ?? titleCaseKey(key),
      value: formatContextBonusValue(key, value),
    });
  }
  return rows;
}

type ParsedContextBlock = {
  bonuses: ClassSlotBonus[];
  upgrade: ClassSlotBonus[];
  compound: ClassSlotBonus[];
  signature: string;
};

function parseContextBlock(raw: unknown): ParsedContextBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const bonuses = bonusRowsFromRecord(record);
  const upgrade =
    record.upgrade && typeof record.upgrade === "object"
      ? bonusRowsFromRecord(record.upgrade as Record<string, unknown>)
      : [];
  const compound =
    record.compound && typeof record.compound === "object"
      ? bonusRowsFromRecord(record.compound as Record<string, unknown>)
      : [];
  if (bonuses.length === 0 && upgrade.length === 0 && compound.length === 0) return null;

  // Stable signature so identical map blocks (graveglass) collapse into one card.
  const flat: Record<string, number> = {};
  for (const [key, value] of Object.entries(record)) {
    if (typeof value === "number") flat[key] = value;
  }
  const nested: Record<string, Record<string, number>> = {};
  for (const nestKey of ["upgrade", "compound"] as const) {
    const nest = record[nestKey];
    if (!nest || typeof nest !== "object") continue;
    const inner: Record<string, number> = {};
    for (const [key, value] of Object.entries(nest as Record<string, unknown>)) {
      if (typeof value === "number") inner[key] = value;
    }
    if (Object.keys(inner).length > 0) nested[nestKey] = inner;
  }
  return {
    bonuses,
    upgrade,
    compound,
    signature: JSON.stringify({ flat, nested }),
  };
}

/**
 * Class-only and map-only bonus blocks on an item def (`item.rogue`, `item.winterland`, …).
 * Map keys that share an identical bonus object are grouped into one row.
 */
export function itemContextBonusRows(
  gItem: GItem,
  lookups?: ItemContextBonusLookups,
): ItemContextBonusRow[] {
  const item = gItem as GItem & Record<string, unknown>;
  const rows: ItemContextBonusRow[] = [];

  for (const classKey of CLASS_KEYS) {
    const parsed = parseContextBlock(item[classKey]);
    if (!parsed || !isClassKey(classKey)) continue;
    rows.push({
      id: `class:${classKey}`,
      scope: {
        kind: "class",
        classKey,
        label: titleCaseKey(classKey),
        href: `/classes/${classKey}`,
        color: CLASS_COLOR[classKey],
      },
      bonuses: parsed.bonuses,
      upgrade: parsed.upgrade,
      compound: parsed.compound,
    });
  }

  if (lookups?.maps) {
    type MapGroup = {
      signature: string;
      parsed: ParsedContextBlock;
      maps: { key: string; label: string; href: string }[];
    };
    const groups: MapGroup[] = [];
    const bySignature = new Map<string, MapGroup>();

    for (const [mapKey, mapDef] of Object.entries(lookups.maps)) {
      if (!mapDef || mapDef.ignore) continue;
      const parsed = parseContextBlock(item[mapKey]);
      if (!parsed) continue;
      const mapEntry = {
        key: mapKey,
        label: mapDef.name ?? titleCaseKey(mapKey),
        href: `/maps/${encodeURIComponent(mapKey)}`,
      };
      const existing = bySignature.get(parsed.signature);
      if (existing) {
        existing.maps.push(mapEntry);
        continue;
      }
      const group: MapGroup = {
        signature: parsed.signature,
        parsed,
        maps: [mapEntry],
      };
      bySignature.set(parsed.signature, group);
      groups.push(group);
    }

    for (const group of groups) {
      const id = `map:${group.maps.map((m) => m.key).join(",")}`;
      rows.push({
        id,
        scope: { kind: "map", maps: group.maps },
        bonuses: group.parsed.bonuses,
        upgrade: group.parsed.upgrade,
        compound: group.parsed.compound,
      });
    }
  }

  return rows;
}
