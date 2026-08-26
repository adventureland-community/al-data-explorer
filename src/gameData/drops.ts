import {
  buildDropsByItem,
  parseDropEntry,
  parseMonsterDropTable,
  resolveDisplayChance,
  tableTotalWeight,
  toAcquisitionDropSources,
  type DropChanceKind,
} from "./dropTable";
import { DropSource } from "./types";

export type { DropChanceKind };
export {
  buildDropsByItem,
  parseDropEntry,
  parseMonsterDropTable,
  resolveDisplayChance,
  tableTotalWeight,
  toAcquisitionDropSources,
};

/** @deprecated Prefer toAcquisitionDropSources — same Drop Table acquisition projection. */
export function extractDropRates(drops: Record<string, unknown>): DropSource[] {
  return toAcquisitionDropSources(drops);
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
