import { ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { CharacterLoadout } from "./fetchCharacterLoadout";

export type GearFrequencyRow = {
  itemKey: ItemKey;
  count: number;
  maxLevel: number;
  sample: ItemInfo;
  slots: SlotType[];
};

/** Count how often each item appears across loadouts (any slot). */
export function gearFrequencyFromLoadouts(loadouts: CharacterLoadout[]): GearFrequencyRow[] {
  const byItem = new Map<
    string,
    { count: number; maxLevel: number; sample: ItemInfo; slots: Set<SlotType> }
  >();

  for (const loadout of loadouts) {
    const seenThisChar = new Set<string>();
    for (const [slot, item] of Object.entries(loadout.gear) as [SlotType, ItemInfo | undefined][]) {
      if (!item?.name) continue;
      const key = item.name;
      const entry = byItem.get(key) ?? {
        count: 0,
        maxLevel: 0,
        sample: item,
        slots: new Set<SlotType>(),
      };
      entry.slots.add(slot);
      const level = typeof item.level === "number" ? item.level : 0;
      if (level >= entry.maxLevel) {
        entry.maxLevel = level;
        entry.sample = item;
      }
      if (!seenThisChar.has(key)) {
        seenThisChar.add(key);
        entry.count += 1;
      }
      byItem.set(key, entry);
    }
  }

  return Array.from(byItem.entries())
    .map(([itemKey, entry]) => ({
      itemKey: itemKey as ItemKey,
      count: entry.count,
      maxLevel: entry.maxLevel,
      sample: entry.sample,
      slots: Array.from(entry.slots).sort(),
    }))
    .sort(
      (a, b) => b.count - a.count || b.maxLevel - a.maxLevel || a.itemKey.localeCompare(b.itemKey),
    );
}
