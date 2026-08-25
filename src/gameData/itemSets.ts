import { GSet, ItemKey } from "typed-adventureland";

import { STAT_DISPLAY_LABELS } from "./statLabels";

export type SetBonusTier = {
  count: number;
  /** e.g. "2+" or "4" (exact when last piece) */
  label: string;
  stats: Array<{ key: string; label: string; value: string }>;
};

function formatBonusValue(key: string, value: number): string {
  if (["crit", "luck", "gold", "evasion", "reflection", "lifesteal", "manasteal"].includes(key)) {
    return `${value}%`;
  }
  if (["critdamage", "speed", "range"].includes(key) && value > 0) {
    return `+${value}${key === "critdamage" ? "%" : ""}`;
  }
  return String(value);
}

export function getSetBonusTiers(set: GSet): SetBonusTier[] {
  const itemCount = set.items?.length ?? 0;
  const tiers: SetBonusTier[] = [];
  const setRecord = set as GSet & Record<string, unknown>;
  for (let count = 1; count <= Math.max(itemCount, 16); count += 1) {
    const raw = setRecord[String(count)];
    if (!raw || typeof raw !== "object") continue;
    const stats: SetBonusTier["stats"] = [];
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof value !== "number" || value === 0) continue;
      stats.push({
        key,
        label: STAT_DISPLAY_LABELS[key] ?? key,
        value: formatBonusValue(key, value),
      });
    }
    if (stats.length === 0) continue;
    const label = count === itemCount ? String(count) : `${count}+`;
    tiers.push({ count, label, stats });
  }
  return tiers;
}

export function getSetMemberKeys(set: GSet | undefined): ItemKey[] {
  if (!set?.items?.length) return [];
  return set.items.filter((key): key is ItemKey => typeof key === "string" && key.length > 0);
}
