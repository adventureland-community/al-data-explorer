import { GCraft, ItemKey } from "typed-adventureland";

export function buildCraftsByIngredient(
  craft: Record<string, GCraft> | undefined,
): Map<ItemKey, ItemKey[]> {
  const map = new Map<ItemKey, ItemKey[]>();
  if (!craft) return map;

  for (const [outputKey, recipe] of Object.entries(craft)) {
    if (!recipe?.items) continue;
    for (const row of recipe.items) {
      const ingredient = row[1];
      if (typeof ingredient !== "string" || !ingredient) continue;
      const key = ingredient as ItemKey;
      const existing = map.get(key);
      if (existing) {
        if (!existing.includes(outputKey as ItemKey)) {
          existing.push(outputKey as ItemKey);
        }
      } else {
        map.set(key, [outputKey as ItemKey]);
      }
    }
  }
  return map;
}
