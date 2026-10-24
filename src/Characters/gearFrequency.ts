import { ClassKey, ItemInfo, ItemKey, SlotType } from "typed-adventureland";

import { CharacterLoadout } from "./fetchCharacterLoadout";

export type GearFrequencyRow = {
  itemKey: ItemKey;
  count: number;
  maxLevel: number;
  sample: ItemInfo;
  slots: SlotType[];
  /** Other classes (from cached loadouts) that also equip this item. */
  alsoUsedBy: ClassKey[];
};

/** Count how often each item appears across loadouts (any slot). */
export function gearFrequencyFromLoadouts(
  loadouts: CharacterLoadout[],
  allCached: CharacterLoadout[] = loadouts,
): GearFrequencyRow[] {
  const byItem = new Map<
    string,
    { count: number; maxLevel: number; sample: ItemInfo; slots: Set<SlotType> }
  >();
  const classesByItem = new Map<string, Set<ClassKey>>();

  for (const loadout of allCached) {
    if (!loadout.classKey) continue;
    const seenThisChar = new Set<string>();
    for (const item of Object.values(loadout.gear)) {
      if (!item?.name || seenThisChar.has(item.name)) continue;
      seenThisChar.add(item.name);
      const set = classesByItem.get(item.name) ?? new Set<ClassKey>();
      set.add(loadout.classKey);
      classesByItem.set(item.name, set);
    }
  }

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

  const focusClasses = new Set(
    loadouts.map((l) => l.classKey).filter((k): k is ClassKey => Boolean(k)),
  );

  return Array.from(byItem.entries())
    .map(([itemKey, entry]) => {
      const others = Array.from(classesByItem.get(itemKey) ?? []).filter(
        (c) => !focusClasses.has(c),
      );
      others.sort((a, b) => a.localeCompare(b));
      return {
        itemKey: itemKey as ItemKey,
        count: entry.count,
        maxLevel: entry.maxLevel,
        sample: entry.sample,
        slots: Array.from(entry.slots).sort(),
        alsoUsedBy: others,
      };
    })
    .sort(
      (a, b) => b.count - a.count || b.maxLevel - a.maxLevel || a.itemKey.localeCompare(b.itemKey),
    );
}
