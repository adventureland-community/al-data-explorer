import type { GCraft, GData, GItem, ItemInfo, ItemInfoPValues, ItemKey } from "typed-adventureland";
import { parseCraftRow } from "../gameData/craftRecipe";
import { calculateItemNpcSellValue } from "../gameData/itemSellValue";

import { CustomGData } from "../GDataContext";
import { getMaxLevel } from "../gameData/itemProperties";
import { ItemsByNameTitleLevel } from "../Market/merchantTypes";
import { getItemGrade, gradeLabel } from "../gameData/playerItemDisplay";
import { itemMatchesClasses } from "../gameData/itemMeta";
import { AggregatedBankItem, formatBankItemLabel, getUniqueItemKey } from "./bankItems";
import { BankDataProps } from "./getBankData";

export type BankItemFilterFlags = {
  exchange?: boolean;
  upgrade?: boolean;
  compound?: boolean;
  craftable?: boolean;
  event?: boolean;
  legacy?: boolean;
};

export type BankItemFilters = {
  titles: string[];
  classes: string[];
  setKeys: string[];
  types: string[];
  minGrade: number;
  flags: BankItemFilterFlags;
};

export const EMPTY_BANK_FILTERS: BankItemFilters = {
  titles: [],
  classes: [],
  setKeys: [],
  types: [],
  minGrade: 0,
  flags: {},
};

export type StackConsolidationSuggestion = {
  item: AggregatedBankItem;
  stackSize: number;
  currentStacks: number;
  optimalStacks: number;
  slotsSaved: number;
};

export type CraftIngredientStatus = {
  key: ItemKey;
  name: string;
  need: number;
  /** Required upgrade/compound level when the recipe specifies one. */
  level?: number;
  /** Required title/skin when the recipe specifies one (e.g. open+armorx). */
  title?: ItemInfoPValues;
  have: number;
  missing: number;
};

export type CraftRecipeStatus = {
  outputKey: ItemKey;
  outputName: string;
  /** Gold craft cost per batch (0 when free). */
  craftCostPerCraft: number;
  /** Batches craftable right now (all ingredients satisfied). */
  craftableCount: number;
  /** Batches possible if missing reagents were acquired — limited by best-stocked ingredient. */
  potentialCraftCount?: number;
  ingredients: CraftIngredientStatus[];
};

export type CraftAnalysis = {
  ready: CraftRecipeStatus[];
  potential: CraftRecipeStatus[];
};

export type CombineRecipeStatus = {
  itemKey: ItemKey;
  level: number;
  title?: ItemInfoPValues;
  displayName: string;
  /** Copies in bank at this level. */
  have: number;
  /** Bank stock plus outputs fed from lower-level combines in the chain. */
  effectiveHave: number;
  /** Copies at this level coming from the previous combine step. */
  cascadeIn: number;
  /** Full combines at the shrine right now (every 3 items). */
  combineReadyCount: number;
  /** Combines possible after acquiring `missing` more copies. */
  potentialCombineCount: number;
  missing: number;
  outputLevel: number;
};

export type CombineAnalysis = {
  ready: CombineRecipeStatus[];
  potential: CombineRecipeStatus[];
};

export function combineGroupKey(itemKey: ItemKey, title?: ItemInfoPValues): string {
  return `${itemKey}:${title ?? ""}`;
}

/** Group per-level combine steps into consecutive chains for one compound item line. */
export function groupCombineSteps(steps: CombineRecipeStatus[]): CombineRecipeStatus[][] {
  if (!steps.length) return [];

  const byGroup = new Map<string, CombineRecipeStatus[]>();
  for (const step of steps) {
    const key = combineGroupKey(step.itemKey, step.title);
    const list = byGroup.get(key) ?? [];
    list.push(step);
    byGroup.set(key, list);
  }

  const chains: CombineRecipeStatus[][] = [];

  for (const groupSteps of byGroup.values()) {
    groupSteps.sort((a, b) => a.level - b.level);
    let chain: CombineRecipeStatus[] = [];

    for (const step of groupSteps) {
      if (!chain.length || step.level === chain[chain.length - 1]!.level + 1) {
        chain.push(step);
      } else {
        chains.push(chain);
        chain = [step];
      }
    }

    if (chain.length) chains.push(chain);
  }

  chains.sort((a, b) => {
    const finalA = a[a.length - 1]!;
    const finalB = b[b.length - 1]!;
    const countA =
      finalA.combineReadyCount > 0 ? finalA.combineReadyCount : finalA.potentialCombineCount;
    const countB =
      finalB.combineReadyCount > 0 ? finalB.combineReadyCount : finalB.potentialCombineCount;
    return countB - countA || finalA.displayName.localeCompare(finalB.displayName);
  });

  return chains;
}

export function computeCombineCounts(have: number): {
  readyCount: number;
  potentialCount: number;
  missing: number;
} {
  const readyCount = Math.floor(have / 3);
  const remainder = have % 3;
  const potentialCount = remainder === 2 ? readyCount + 1 : readyCount;
  const missing = remainder === 2 ? 1 : 0;
  return { readyCount, potentialCount, missing };
}

export function analyzeCompoundCombines(
  items: AggregatedBankItem[],
  G: CustomGData,
): CombineAnalysis {
  const groups = new Map<
    string,
    {
      itemKey: ItemKey;
      title?: ItemInfoPValues;
      maxLevel: number;
      stockByLevel: Map<number, number>;
      displayName: string;
    }
  >();

  for (const item of items) {
    const gItem = G.items[item.name];
    if (!gItem?.compound) continue;

    const maxLevel = getMaxLevel(gItem) ?? 7;
    if (item.level >= maxLevel) continue;

    const groupKey = combineGroupKey(item.name, item.p);
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        itemKey: item.name,
        title: item.p,
        maxLevel,
        stockByLevel: new Map(),
        displayName: formatBankItemLabel(item, G),
      };
      groups.set(groupKey, group);
    }

    group.stockByLevel.set(item.level, (group.stockByLevel.get(item.level) ?? 0) + item.q);
  }

  const ready: CombineRecipeStatus[] = [];
  const potential: CombineRecipeStatus[] = [];

  for (const group of groups.values()) {
    let carryReady = 0;
    let carryPotential = 0;

    for (let level = 0; level < group.maxLevel; level++) {
      const bankHave = group.stockByLevel.get(level) ?? 0;
      const effectiveReady = bankHave + carryReady;
      const effectivePotential = bankHave + carryPotential;

      if (effectiveReady < 2 && effectivePotential < 2) {
        carryReady = 0;
        carryPotential = 0;
        continue;
      }

      const readyStats = computeCombineCounts(effectiveReady);
      const potentialStats = computeCombineCounts(effectivePotential);

      const base = {
        itemKey: group.itemKey,
        level,
        title: group.title,
        displayName: group.displayName,
        have: bankHave,
        outputLevel: level + 1,
      };

      if (readyStats.readyCount > 0) {
        ready.push({
          ...base,
          effectiveHave: effectiveReady,
          cascadeIn: carryReady,
          combineReadyCount: readyStats.readyCount,
          potentialCombineCount: readyStats.potentialCount,
          missing: readyStats.missing,
        });
      }

      if (potentialStats.potentialCount > readyStats.readyCount) {
        potential.push({
          ...base,
          effectiveHave: effectivePotential,
          cascadeIn: carryPotential,
          combineReadyCount: readyStats.readyCount,
          potentialCombineCount: potentialStats.potentialCount,
          missing: potentialStats.missing,
        });
      }

      carryReady = readyStats.readyCount;
      carryPotential = potentialStats.potentialCount;
    }
  }

  const byCombineCount = (a: CombineRecipeStatus, b: CombineRecipeStatus) =>
    b.combineReadyCount - a.combineReadyCount ||
    b.potentialCombineCount - a.potentialCombineCount ||
    a.level - b.level ||
    a.displayName.localeCompare(b.displayName);

  ready.sort(byCombineCount);

  potential.sort((a, b) => {
    if (b.potentialCombineCount !== a.potentialCombineCount) {
      return b.potentialCombineCount - a.potentialCombineCount;
    }
    if (a.missing !== b.missing) return a.missing - b.missing;
    return a.level - b.level || a.displayName.localeCompare(b.displayName);
  });

  return { ready, potential };
}

export type BankSellPriceSource = "merchant" | "npc";

export type BankSellLineItem = {
  item: AggregatedBankItem;
  unitPrice: number;
  totalValue: number;
  priceSource: BankSellPriceSource;
  /** Merchant player name offering the best buy price, when known. */
  merchantId?: string;
};

export type BankValueBreakdown = {
  bankGold: number;
  itemsSellValue: number;
  totalEstimate: number;
  pricedItemCount: number;
  unpricedItemCount: number;
};

export function getBankItemSellQuote(
  item: AggregatedBankItem,
  merchantItems: ItemsByNameTitleLevel | undefined,
  G?: GData,
): { unitPrice: number; priceSource: BankSellPriceSource; merchantId?: string } | undefined {
  const gItem = G?.items[item.name];
  const titleKey = item.p ?? "";
  const buying = merchantItems?.[item.name]?.[titleKey]?.[item.level]?.buying;
  const maxBuyPrice = buying?.maxPrice?.price ?? 0;

  if (maxBuyPrice > 0) {
    return {
      unitPrice: maxBuyPrice,
      priceSource: "merchant",
      merchantId: buying?.maxPrice?.merchant,
    };
  }

  const avgBuyPrice = buying?.avgPrice ?? 0;
  if (avgBuyPrice > 0) {
    return {
      unitPrice: avgBuyPrice,
      priceSource: "merchant",
    };
  }

  if (gItem) {
    const npcValue = calculateItemNpcSellValue(item, gItem, G as GData);
    if (npcValue > 0) {
      return { unitPrice: npcValue, priceSource: "npc" };
    }
  }

  return undefined;
}

export function computeBankSellBreakdown(
  items: AggregatedBankItem[],
  merchantItems: ItemsByNameTitleLevel | undefined,
  G?: GData,
): BankSellLineItem[] {
  const lines: BankSellLineItem[] = [];

  for (const item of items) {
    const quote = getBankItemSellQuote(item, merchantItems, G);
    if (!quote) continue;

    lines.push({
      item,
      unitPrice: quote.unitPrice,
      totalValue: quote.unitPrice * item.q,
      priceSource: quote.priceSource,
      merchantId: quote.merchantId,
    });
  }

  lines.sort((a, b) => {
    const merchantBoostA = a.priceSource === "merchant" ? 1 : 0;
    const merchantBoostB = b.priceSource === "merchant" ? 1 : 0;
    if (merchantBoostA !== merchantBoostB) return merchantBoostB - merchantBoostA;

    if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;

    return formatBankItemLabel(a.item, G).localeCompare(formatBankItemLabel(b.item, G));
  });

  return lines;
}

export type PackUtilization = {
  packKey: string;
  usedSlots: number;
  totalSlots: number;
  fillRatio: number;
};

export type BankItemLocation = {
  packKey: string;
  slotIndex: number;
  item: ItemInfo;
};

export function getBankQuantities(bankData: BankDataProps): Map<ItemKey, number> {
  const quantities = new Map<ItemKey, number>();

  for (const value of Object.values(bankData)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item?.name) continue;
      const key = item.name as ItemKey;
      quantities.set(key, (quantities.get(key) ?? 0) + (item.q ?? 1));
    }
  }

  return quantities;
}

/** Bank stock for a craft ingredient, optionally filtered to level and/or title. */
export function getBankQuantityForIngredient(
  bankData: BankDataProps,
  key: ItemKey,
  level?: number,
  title?: ItemInfoPValues,
): number {
  let total = 0;

  for (const value of Object.values(bankData)) {
    if (!Array.isArray(value)) continue;
    for (const item of value) {
      if (!item?.name || item.name !== key) continue;
      const itemLevel = item.level ?? 0;
      if (title != null) {
        if ((item.p ?? "") !== title) continue;
      } else if (level != null) {
        if (itemLevel !== level) continue;
      } else if (itemLevel !== 0) {
        continue;
      }
      total += item.q ?? 1;
    }
  }

  return total;
}

export function computeStackConsolidation(
  items: AggregatedBankItem[],
  G?: GData,
): { suggestions: StackConsolidationSuggestion[]; totalSlotsSaved: number } {
  const suggestions: StackConsolidationSuggestion[] = [];
  let totalSlotsSaved = 0;

  for (const item of items) {
    const gItem = G?.items[item.name];
    const stackSize = Number(gItem?.s);
    if (!stackSize || stackSize <= 1) continue;

    const optimalStacks = Math.ceil(item.q / stackSize);
    const slotsSaved = item.stack - optimalStacks;
    if (slotsSaved <= 0) continue;

    suggestions.push({
      item,
      stackSize,
      currentStacks: item.stack,
      optimalStacks,
      slotsSaved,
    });
    totalSlotsSaved += slotsSaved;
  }

  suggestions.sort(
    (a, b) =>
      b.slotsSaved - a.slotsSaved ||
      formatBankItemLabel(b.item).localeCompare(formatBankItemLabel(a.item)),
  );

  return { suggestions, totalSlotsSaved };
}

function itemHasFlag(gItem: GItem, flag: keyof BankItemFilterFlags): boolean {
  const extras = gItem as GItem & {
    e?: unknown;
    event?: boolean;
    legacy?: unknown;
  };
  switch (flag) {
    case "exchange":
      return Boolean(extras.e);
    case "upgrade":
      return Boolean(gItem.upgrade);
    case "compound":
      return Boolean(gItem.compound);
    case "craftable":
      return false;
    case "event":
      return Boolean(extras.event);
    case "legacy":
      return Boolean(extras.legacy);
    default:
      return false;
  }
}

export function bankItemMatchesFilters(
  item: AggregatedBankItem,
  G: GData | undefined,
  filters: BankItemFilters,
): boolean {
  const gItem = G?.items[item.name];
  if (!gItem) return filters.titles.length === 0 && filters.minGrade === 0;

  if (filters.titles.length && (!item.p || !filters.titles.includes(item.p))) {
    return false;
  }

  if (filters.classes.length && !itemMatchesClasses(gItem, filters.classes)) {
    return false;
  }

  if (filters.setKeys.length) {
    const setKey = (gItem as { set?: string }).set;
    if (!setKey || !filters.setKeys.includes(setKey)) return false;
  }

  if (filters.types.length && (!gItem.type || !filters.types.includes(gItem.type))) {
    return false;
  }

  if (filters.minGrade > 0) {
    const grade = getItemGrade(gItem, item.level);
    if (grade < filters.minGrade) return false;
  }

  for (const [flag, enabled] of Object.entries(filters.flags)) {
    if (!enabled) continue;
    if (flag === "craftable") {
      const craftMap = (G as CustomGData)?.craft as Record<string, GCraft> | undefined;
      if (!craftMap?.[item.name]) return false;
      continue;
    }
    if (!itemHasFlag(gItem, flag as keyof BankItemFilterFlags)) return false;
  }

  return true;
}

/** Max crafts supported by the ingredient you have the most of (by batch count). */
export function computePotentialCraftCount(
  ingredients: Pick<CraftIngredientStatus, "need" | "have">[],
): number {
  if (!ingredients.length) return 0;
  return Math.max(
    ...ingredients.map((ingredient) => Math.floor(ingredient.have / ingredient.need)),
  );
}

export function computeMissingForCraftCount(
  ingredients: CraftIngredientStatus[],
  craftCount: number,
): CraftIngredientStatus[] {
  return ingredients.map((ingredient) => ({
    ...ingredient,
    missing: Math.max(0, craftCount * ingredient.need - ingredient.have),
  }));
}

export function analyzeCraftRecipes(G: CustomGData, bankData: BankDataProps): CraftAnalysis {
  const craftMap = G.craft as Record<string, GCraft> | undefined;
  if (!craftMap) return { ready: [], potential: [] };

  const ready: CraftRecipeStatus[] = [];
  const potential: CraftRecipeStatus[] = [];

  for (const [outputKey, recipe] of Object.entries(craftMap)) {
    if (!recipe?.items?.length) continue;

    const ingredients: CraftIngredientStatus[] = recipe.items.map((row) => {
      const { quantity: need, itemKey: key, level, title } = parseCraftRow(row);
      const have = getBankQuantityForIngredient(bankData, key, level, title);
      return {
        key,
        name: G.items[key]?.name ?? key,
        need,
        level,
        title,
        have,
        missing: Math.max(0, need - have),
      };
    });

    const craftableCount = Math.min(
      ...ingredients.map((ingredient) => Math.floor(ingredient.have / ingredient.need)),
    );

    const potentialCraftCount = computePotentialCraftCount(ingredients);
    const hasPartialStock = ingredients.some((ingredient) => ingredient.have > 0);
    const craftCostPerCraft = recipe.cost ?? 0;

    const outputKeyTyped = outputKey as ItemKey;
    const outputName = G.items[outputKeyTyped]?.name ?? outputKey;

    if (craftableCount > 0) {
      ready.push({
        outputKey: outputKeyTyped,
        outputName,
        craftCostPerCraft,
        craftableCount,
        ingredients,
      });
    }

    if (potentialCraftCount > craftableCount && hasPartialStock) {
      potential.push({
        outputKey: outputKeyTyped,
        outputName,
        craftCostPerCraft,
        craftableCount,
        potentialCraftCount,
        ingredients: computeMissingForCraftCount(ingredients, potentialCraftCount),
      });
    }
  }

  ready.sort(
    (a, b) => b.craftableCount - a.craftableCount || a.outputName.localeCompare(b.outputName),
  );

  potential.sort((a, b) => {
    const readyBoostA = a.craftableCount > 0 ? 1 : 0;
    const readyBoostB = b.craftableCount > 0 ? 1 : 0;
    if (readyBoostA !== readyBoostB) return readyBoostB - readyBoostA;

    const potentialA = a.potentialCraftCount ?? 0;
    const potentialB = b.potentialCraftCount ?? 0;
    if (potentialA !== potentialB) return potentialB - potentialA;

    const missingTypesA = a.ingredients.filter((ingredient) => ingredient.missing > 0).length;
    const missingTypesB = b.ingredients.filter((ingredient) => ingredient.missing > 0).length;
    if (missingTypesA !== missingTypesB) return missingTypesA - missingTypesB;

    const totalMissingA = a.ingredients.reduce((sum, ingredient) => sum + ingredient.missing, 0);
    const totalMissingB = b.ingredients.reduce((sum, ingredient) => sum + ingredient.missing, 0);
    if (totalMissingA !== totalMissingB) return totalMissingA - totalMissingB;

    return a.outputName.localeCompare(b.outputName);
  });

  return { ready, potential };
}

export function estimateBankValue(
  items: AggregatedBankItem[],
  merchantItems: ItemsByNameTitleLevel | undefined,
  bankGold: number,
  G?: GData,
): BankValueBreakdown {
  const sellLines = computeBankSellBreakdown(items, merchantItems, G);
  const itemsSellValue = sellLines.reduce((sum, line) => sum + line.totalValue, 0);

  return {
    bankGold,
    itemsSellValue,
    totalEstimate: bankGold + itemsSellValue,
    pricedItemCount: sellLines.length,
    unpricedItemCount: items.length - sellLines.length,
  };
}

export function computePackUtilization(
  bankData: BankDataProps,
  slotsPerPack = 42,
): PackUtilization[] {
  const packs: PackUtilization[] = [];

  for (const [packKey, packItems] of Object.entries(bankData)) {
    if (!Array.isArray(packItems)) continue;
    const usedSlots = packItems.filter(Boolean).length;
    packs.push({
      packKey,
      usedSlots,
      totalSlots: slotsPerPack,
      fillRatio: usedSlots / slotsPerPack,
    });
  }

  packs.sort((a, b) => {
    const aNum = /^items(\d+)$/.exec(a.packKey);
    const bNum = /^items(\d+)$/.exec(b.packKey);
    if (aNum && bNum) return Number(aNum[1]) - Number(bNum[1]);
    return a.packKey.localeCompare(b.packKey);
  });

  return packs;
}

export function findItemLocations(bankData: BankDataProps, uniqueKey: string): BankItemLocation[] {
  const locations: BankItemLocation[] = [];

  for (const [packKey, packItems] of Object.entries(bankData)) {
    if (!Array.isArray(packItems)) continue;
    packItems.forEach((item, slotIndex) => {
      if (!item) return;
      if (getUniqueItemKey(item) === uniqueKey) {
        locations.push({ packKey, slotIndex, item });
      }
    });
  }

  return locations;
}

export function filterBankChanges(
  changes: import("./bankItems").BankItemChange[],
  mode: "all" | "gear" | "quantity",
  G?: GData,
): import("./bankItems").BankItemChange[] {
  if (mode === "all") return changes;

  return changes.filter((change) => {
    const gItem = G?.items[change.item.name];
    if (mode === "gear") {
      return Boolean(gItem?.upgrade || gItem?.compound || change.item.level > 0);
    }
    return change.kind === "changed" && (change.deltaQ ?? 0) !== 0;
  });
}

export function gradeFilterOptions() {
  return [
    { value: 0, label: "Any grade" },
    { value: 1, label: gradeLabel(1) ?? "High" },
    { value: 2, label: gradeLabel(2) ?? "Rare" },
    { value: 3, label: gradeLabel(3) ?? "Legendary" },
    { value: 4, label: gradeLabel(4) ?? "Exalted" },
  ];
}
