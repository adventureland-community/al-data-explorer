import { ItemKey } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { prepareDropSourcesForDisplay } from "./drops";
import { parseCraftOutput } from "./itemInstanceData";
import { normalizeTokenShopOffer } from "./tokenShopOffer";

export type CxJarVariantSource =
  | {
      kind: "drop";
      sourceType: string;
      sourceKey: string;
      label: string;
      oddsLabel: string;
      homeServer?: boolean;
      linkTo?: string;
    }
  | {
      kind: "token";
      tokenKey: string;
      label: string;
      costLabel: string;
      linkTo: string;
    }
  | {
      kind: "craft";
      recipeKey: string;
      label: string;
      costLabel?: string;
      linkTo: string;
    };

export type CxJarVariant = {
  data: string;
  sources: CxJarVariantSource[];
};

/**
 * Every known CX Jar payload (`ItemInfo.data`) from drops, token shops, and craft outputs.
 * Used on `/items/cxjar` to list sealed cosmetics.
 */
export function listCxJarVariants(G: CustomGData): CxJarVariant[] {
  const byData = new Map<string, CxJarVariantSource[]>();

  const push = (data: string, source: CxJarVariantSource) => {
    if (!data) return;
    const list = byData.get(data) ?? [];
    list.push(source);
    byData.set(data, list);
  };

  const drops = prepareDropSourcesForDisplay(G.indexes.dropsByItem.get("cxjar" as ItemKey) ?? []);
  for (const drop of drops) {
    if (!drop.title) continue;
    const isMonster = drop.sourceType === "monster" || drop.sourceType === "monster_home";
    const monsterName = isMonster
      ? (G.monsters as Record<string, { name?: string } | undefined>)?.[drop.sourceKey]?.name
      : undefined;
    const mapName =
      drop.sourceType === "map"
        ? (G.maps as Record<string, { name?: string } | undefined>)?.[drop.sourceKey]?.name
        : undefined;
    const baseLabel = isMonster
      ? monsterName ?? drop.sourceKey
      : drop.sourceType === "map"
      ? mapName ?? drop.sourceKey
      : drop.sourceKey;
    push(drop.title, {
      kind: "drop",
      sourceType: drop.sourceType,
      sourceKey: drop.sourceKey,
      label: baseLabel,
      oddsLabel: drop.oddsLabel,
      homeServer: drop.sourceType === "monster_home",
      linkTo: isMonster
        ? `/monsters?monster=${encodeURIComponent(drop.sourceKey)}`
        : drop.sourceType === "map"
        ? `/maps/${encodeURIComponent(drop.sourceKey)}`
        : drop.sourceType === "table"
        ? `/items/${encodeURIComponent(drop.sourceKey)}`
        : undefined,
    });
  }

  const tokenOffers = G.indexes.tokenOffersByItem.get("cxjar" as ItemKey) ?? [];
  for (const offer of tokenOffers) {
    if (!offer.data) continue;
    const tokenName = G.items[offer.tokenKey as ItemKey]?.name ?? offer.tokenKey;
    const normalized = normalizeTokenShopOffer(offer.cost);
    push(offer.data, {
      kind: "token",
      tokenKey: offer.tokenKey,
      label: offer.npcName ?? tokenName,
      costLabel:
        normalized.tokenCost > 0
          ? `${normalized.tokenCost.toLocaleString("en-US")} × ${tokenName}`
          : tokenName,
      linkTo: `/items/${encodeURIComponent(offer.tokenKey)}`,
    });
  }

  const craft = G.craft as Record<string, { cost?: number; output?: unknown }> | undefined;
  if (craft) {
    for (const [recipeKey, recipe] of Object.entries(craft)) {
      const output = parseCraftOutput(recipe, recipeKey);
      if (output.name !== "cxjar" || !output.data) continue;
      push(output.data, {
        kind: "craft",
        recipeKey,
        label: G.items[recipeKey as ItemKey]?.name ?? recipeKey,
        costLabel: recipe.cost != null ? `${recipe.cost.toLocaleString("en-US")}g` : undefined,
        linkTo: `/items/${encodeURIComponent(recipeKey)}`,
      });
    }
  }

  return [...byData.entries()]
    .map(([data, sources]) => ({ data, sources }))
    .sort((a, b) => a.data.localeCompare(b.data));
}
