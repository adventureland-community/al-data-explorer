import type { GItem, StatType } from "typed-adventureland";

import { itemTitleDefsFromG, resolveItemInstanceStats } from "../../gameData/itemProperties";

/** Resolve item stats for `attr:` matching (level + title + optional scroll). */
export function buildItemStatsForSearch(args: {
  def: GItem;
  level?: number;
  p?: string;
  statType?: StatType | string;
  G?: { titles?: unknown };
}): Record<string, number | undefined> {
  const titles = args.G ? itemTitleDefsFromG(args.G) : undefined;
  const resolved = resolveItemInstanceStats({
    def: args.def,
    itemInfo: {
      level: args.level,
      p: args.p,
      stat_type: args.statType as StatType | undefined,
    },
    titles,
    G: args.G,
  });
  const out: Record<string, number | undefined> = {};
  for (const [key, value] of Object.entries(resolved)) {
    out[key] = value;
  }
  return out;
}
