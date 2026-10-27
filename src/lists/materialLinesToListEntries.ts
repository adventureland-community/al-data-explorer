import type { MaterialLine } from "../gameData/upgradePathSummary";

import type { NewListEntryInput } from "./types";

const PSEUDO_KEYS = new Set(["_stacks", "_craft_fee"]);

function buyQty(expected: number): number {
  if (!Number.isFinite(expected) || expected <= 0) return 0;
  return Math.max(1, Math.ceil(expected));
}

/**
 * Map Upgrade Calculator materials into list entry inputs.
 * Pseudo-keys (`_stacks`, `_craft_fee`) become free-text notes — not catalog items.
 */
export function materialLinesToListEntries(
  materials: MaterialLine[],
  materialLabel: (key: string) => string,
): NewListEntryInput[] {
  const out: NewListEntryInput[] = [];
  for (const line of materials) {
    if (PSEUDO_KEYS.has(line.itemKey)) {
      const label = materialLabel(line.itemKey);
      const gold = Number.isFinite(line.total) ? Math.round(line.total) : null;
      const note =
        gold != null
          ? `${label} (plan EV ${gold.toLocaleString()}g)`
          : `${label} (from upgrade plan)`;
      out.push({ note, qty: 1 });
      continue;
    }
    const qty = buyQty(line.expectedQty);
    if (qty <= 0) continue;
    out.push({ itemKey: line.itemKey, qty });
  }
  return out;
}
