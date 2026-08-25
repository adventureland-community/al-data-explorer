import { ItemKey } from "typed-adventureland";

/** `G.dismantle[output]` — reverse craft into materials. */
export type GDismantle = {
  items: Array<[number, string] | [number, string, number]>;
  cost?: number;
};

export function buildDismantlesByIngredient(
  dismantle: Record<string, GDismantle> | undefined,
): Map<ItemKey, ItemKey[]> {
  const map = new Map<ItemKey, ItemKey[]>();
  if (!dismantle) return map;

  for (const [outputKey, recipe] of Object.entries(dismantle)) {
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
