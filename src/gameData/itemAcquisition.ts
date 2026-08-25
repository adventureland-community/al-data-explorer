import { ItemKey } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import {
  formatDropProbability,
  getDropSourceLink,
  getMapDisplayName,
  prepareDropSourcesForDisplay,
} from "./drops";
import { DropSourceType, GItems, NpcShopSource, TokenOfferSource } from "./types";

export type DropIconKind = "monster" | "table-item" | "map-text" | "key-fallback" | "none";

/** Display-ready drop row for browse (compact) and detail (list). */
export type AcquisitionDropView = {
  id: string;
  sourceType: DropSourceType;
  sourceKey: string;
  label: string;
  secondary?: string;
  oddsLabel: string;
  linkTo?: string;
  icon: { kind: DropIconKind; key: string };
};

export type AcquisitionShopView = {
  npcId: string;
  label: string;
  mapLabel?: string;
  /** What you pay the NPC to buy (gold or shells). */
  priceLabel: string;
};

export type AcquisitionTokenView = {
  tokenKey: string;
  tokenName: string;
  costLabel: string;
  npcId?: string;
  npcLabel?: string;
  linkTo: string;
};

/** Reward from exchanging an input item (`G.items[input].e` + `G.drops[input]`). */
export type AcquisitionExchangeView = {
  id: string;
  inputKey: string;
  label: string;
  secondary?: string;
  oddsLabel: string;
  linkTo: string;
};

export type AcquisitionCraftView = {
  /** Ways to obtain via craft/dismantle — not "used as ingredient" (that's ItemDetail cards). */
  kind: "craft" | "dismantle" | "dismantle-ingredient";
  label: string;
  secondary?: string;
  linkTo?: string;
};

export type ItemAcquisition = {
  drops: AcquisitionDropView[];
  shops: AcquisitionShopView[];
  tokens: AcquisitionTokenView[];
  exchanges: AcquisitionExchangeView[];
  crafts: AcquisitionCraftView[];
  hasSources: boolean;
};

type AcquisitionLookups = {
  items: GItems;
  monsters?: Record<string, { name?: string }>;
  maps?: Record<string, { name?: string } | undefined>;
  spawnsByMonster?: Map<string, string[]>;
  npcMaps?: Map<string, { mapKey: string; mapName: string | null }[]>;
};

function isExchangeInput(items: GItems, sourceKey: string): boolean {
  const item = items[sourceKey as ItemKey] as { e?: number } | undefined;
  return item?.e != null && Number.isFinite(item.e);
}

function dropIcon(
  sourceType: DropSourceType,
  sourceKey: string,
  items: GItems,
): AcquisitionDropView["icon"] {
  if (sourceType === "monster") return { kind: "monster", key: sourceKey };
  if (sourceType === "map") return { kind: "map-text", key: sourceKey };
  if (sourceType === "table" && items[sourceKey as ItemKey]) {
    return { kind: "table-item", key: sourceKey };
  }
  if (sourceType === "table") return { kind: "key-fallback", key: sourceKey };
  return { kind: "none", key: sourceKey };
}

function toDropAndExchangeViews(
  itemKey: ItemKey,
  lookups: AcquisitionLookups,
  G: CustomGData,
): { drops: AcquisitionDropView[]; exchanges: AcquisitionExchangeView[] } {
  const raw = G.indexes.dropsByItem.get(itemKey) ?? [];
  const prepared = prepareDropSourcesForDisplay(raw);
  const { items, monsters, maps, spawnsByMonster } = lookups;
  const drops: AcquisitionDropView[] = [];
  const exchanges: AcquisitionExchangeView[] = [];

  for (const drop of prepared) {
    const oddsLabel =
      drop.oddsLabel || (drop.probability != null ? formatDropProbability(drop.probability) : "—");

    if (drop.sourceType === "table" && isExchangeInput(items, drop.sourceKey)) {
      const input = items[drop.sourceKey as ItemKey] as { name?: string; e?: number } | undefined;
      const qty = input?.e != null && input.e > 1 ? input.e : null;
      exchanges.push({
        id: `exchange-${drop.sourceKey}-${oddsLabel}`,
        inputKey: drop.sourceKey,
        label: input?.name ?? drop.sourceKey,
        secondary:
          [
            qty != null ? `${qty} per exchange` : null,
            input?.name && input.name !== drop.sourceKey ? drop.sourceKey : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined,
        oddsLabel,
        linkTo: `/items/${drop.sourceKey}`,
      });
      continue;
    }

    const mapName = drop.sourceType === "map" ? getMapDisplayName(drop.sourceKey, maps) : undefined;
    const monsterName =
      drop.sourceType === "monster" ? monsters?.[drop.sourceKey]?.name : undefined;
    const tableItemName =
      drop.sourceType === "table" ? items[drop.sourceKey as ItemKey]?.name : undefined;

    let label: string;
    let secondary: string | undefined;
    switch (drop.sourceType) {
      case "monster": {
        label = monsterName ?? drop.sourceKey;
        const parts = [
          monsterName && monsterName !== drop.sourceKey ? drop.sourceKey : null,
          (() => {
            const spawnMaps = spawnsByMonster?.get(drop.sourceKey);
            return spawnMaps && spawnMaps.length > 0 ? `Maps: ${spawnMaps.join(", ")}` : null;
          })(),
        ].filter(Boolean);
        secondary = parts.length > 0 ? parts.join(" · ") : undefined;
        break;
      }
      case "map":
        label = mapName ?? drop.sourceKey;
        secondary = mapName && mapName !== drop.sourceKey ? drop.sourceKey : undefined;
        break;
      case "table":
        label = tableItemName ?? drop.sourceKey;
        secondary = tableItemName ? drop.sourceKey : undefined;
        break;
      case "gold":
        label = `Gold drop: ${drop.sourceKey}`;
        break;
      default: {
        const _exhaustive: never = drop.sourceType;
        label = `${_exhaustive}: ${drop.sourceKey}`;
      }
    }

    drops.push({
      id: `${drop.sourceType}-${drop.sourceKey}-${drop.itemKey}-${oddsLabel}`,
      sourceType: drop.sourceType,
      sourceKey: drop.sourceKey,
      label,
      secondary,
      oddsLabel,
      linkTo: getDropSourceLink(drop, items),
      icon: dropIcon(drop.sourceType, drop.sourceKey, items),
    });
  }

  return { drops, exchanges };
}

/** NPC shelf price: shells (`cash`) when set, otherwise gold (`g`). */
export function formatNpcBuyPrice(item: { g?: number; cash?: number } | null | undefined): string {
  if (!item) return "—";
  if (item.cash != null && Number.isFinite(item.cash)) {
    return `${item.cash.toLocaleString("en-US")} shells`;
  }
  if (item.g != null && Number.isFinite(item.g)) {
    return `${item.g.toLocaleString("en-US")}g`;
  }
  return "—";
}

function toShopViews(
  itemKey: ItemKey,
  shops: NpcShopSource[],
  lookups: AcquisitionLookups,
  items: GItems,
): AcquisitionShopView[] {
  const priceLabel = formatNpcBuyPrice(items[itemKey]);
  const seen = new Set<string>();
  const views: AcquisitionShopView[] = [];

  for (const shop of shops) {
    if (seen.has(shop.npcId)) continue;
    seen.add(shop.npcId);
    const maps = lookups.npcMaps?.get(shop.npcId) ?? [];
    const mapLabel = maps.map((m) => m.mapName ?? m.mapKey).join(", ") || undefined;
    views.push({
      npcId: shop.npcId,
      label: shop.name ?? shop.npcId,
      mapLabel: [shop.role, mapLabel].filter(Boolean).join(" · ") || undefined,
      priceLabel,
    });
  }

  return views;
}

function toTokenViews(offers: TokenOfferSource[], items: GItems): AcquisitionTokenView[] {
  return offers.map((offer) => {
    const tokenItem = items[offer.tokenKey as ItemKey];
    const tokenName = tokenItem?.name ?? offer.tokenKey;
    const costLabel =
      offer.cost != null
        ? `${offer.cost.toLocaleString("en-US")} × ${tokenName}`
        : `? × ${tokenName}`;
    return {
      tokenKey: offer.tokenKey,
      tokenName,
      costLabel,
      npcId: offer.npcId ?? undefined,
      npcLabel: offer.npcName ?? offer.npcId ?? undefined,
      linkTo: `/items/${offer.tokenKey}`,
    };
  });
}

/**
 * Item Acquisition — where to get an item (drops, NPC shops, token shops, exchanges).
 * Browse and detail are thin adapters over this view-model.
 */
export function getItemAcquisition(itemKey: ItemKey, G: CustomGData): ItemAcquisition {
  const lookups: AcquisitionLookups = {
    items: G.items,
    monsters: G.monsters as Record<string, { name?: string }>,
    maps: G.maps as Record<string, { name?: string } | undefined>,
    spawnsByMonster: G.indexes.spawnsByMonster as Map<string, string[]>,
    npcMaps: G.indexes.npcMaps,
  };

  const { drops, exchanges } = toDropAndExchangeViews(itemKey, lookups, G);
  const shops = toShopViews(itemKey, G.indexes.shopsByItem.get(itemKey) ?? [], lookups, G.items);
  const tokens = toTokenViews(G.indexes.tokenOffersByItem.get(itemKey) ?? [], G.items);

  const crafts: AcquisitionCraftView[] = [];
  const craftRecipe = (G.craft as Record<string, { cost?: number }> | undefined)?.[itemKey];
  if (craftRecipe) {
    crafts.push({
      kind: "craft",
      label: "Craftable",
      secondary:
        craftRecipe.cost != null ? `${craftRecipe.cost.toLocaleString("en-US")}g` : undefined,
      linkTo: `/items/${itemKey}`,
    });
  }
  const dismantleRecipe = (G.dismantle as Record<string, { cost?: number }> | undefined)?.[itemKey];
  if (dismantleRecipe) {
    crafts.push({
      kind: "dismantle",
      label: "Dismantleable",
      secondary:
        dismantleRecipe.cost != null
          ? `${dismantleRecipe.cost.toLocaleString("en-US")}g`
          : undefined,
    });
  }
  for (const output of G.indexes.dismantlesByIngredient.get(itemKey) ?? []) {
    const name = G.items[output]?.name ?? output;
    crafts.push({
      kind: "dismantle-ingredient",
      label: `From dismantling: ${name}`,
      secondary: output,
      linkTo: `/items/${output}`,
    });
  }

  return {
    drops,
    shops,
    tokens,
    exchanges,
    crafts,
    hasSources:
      drops.length > 0 ||
      shops.length > 0 ||
      tokens.length > 0 ||
      exchanges.length > 0 ||
      crafts.length > 0,
  };
}

/** Per-G cache — browse calls this for every visible row; avoid rebuilding view-models. */
const acquisitionCache = new WeakMap<CustomGData, Map<string, ItemAcquisition>>();

export function getItemAcquisitionCached(itemKey: ItemKey, G: CustomGData): ItemAcquisition {
  let byItem = acquisitionCache.get(G);
  if (!byItem) {
    byItem = new Map();
    acquisitionCache.set(G, byItem);
  }
  const hit = byItem.get(itemKey);
  if (hit) return hit;
  const next = getItemAcquisition(itemKey, G);
  byItem.set(itemKey, next);
  return next;
}
