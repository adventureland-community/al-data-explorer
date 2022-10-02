import { GItem, StatType } from "adventureland";

export const calculateItemStatsByLevel = (gItem: GItem, level?: number) => {
  const stats: { [T in StatType]?: number } = {};
  // TODO: base stats from item
  // compound / upgrade contains the stats gained for each level
  Object.entries(gItem).forEach(([key, value]) => {
    const stat = key as StatType;
    // just add all numbers as a stat, can probably verify stat types later, or hardcode them.
    if (typeof value === "number") {
      stats[stat] = value;
    }
  });

  const levelIncrease = { ...gItem.upgrade, ...gItem.compound };

  if (level && level > 0) {
    Object.entries(levelIncrease).forEach(([key, value]) => {
      const stat = key as StatType;
      stats[stat] = (stats[stat] ?? 0) + value * level;
    });
  }

  return stats;
};
