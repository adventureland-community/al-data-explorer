import { ItemKey } from "typed-adventureland";

import { CustomGData } from "../GDataContext";
import { expandOpenForAcquisition, parseDropEntry, tableTotalWeight } from "./dropTable";
import { formatDropProbability, mergeDropSources } from "./drops";
import { normalizeTokenShopOffer } from "./tokenShopOffer";
import { DropSource, GItems } from "./types";

/** Item purchasable by spending this token at a token NPC. */
export type UseTokenSpendView = {
  id: string;
  itemKey: string;
  label: string;
  secondary?: string;
  /** Raw G.tokens price (may be fractional). */
  cost: number | null;
  /** Tokens spent per purchase after normalizing fractional prices. */
  tokenCost: number;
  /** Items received per purchase. */
  quantity: number;
  costLabel: string;
  tokenKey: string;
  npcId?: string;
  npcLabel?: string;
  linkTo: string;
};

/** Rewards from exchanging this item (`G.items[key].e` + `G.drops[key]`). */
export type UseExchangeRewardView = {
  id: string;
  itemKey: string;
  label: string;
  secondary?: string;
  oddsLabel: string;
  linkTo: string;
};

export type UseMerchantRef = {
  npcId: string;
  npcLabel: string;
};

/** Token shop spends grouped under their vendor NPC. */
export type UseTokenVendorGroup = {
  npcId?: string;
  npcLabel?: string;
  spends: UseTokenSpendView[];
};

export type ItemUses = {
  tokenVendors: UseTokenVendorGroup[];
  /** Flat list kept for tests / callers that don't need grouping. */
  tokenSpends: UseTokenSpendView[];
  exchangeNpc?: UseMerchantRef;
  exchangeRewards: UseExchangeRewardView[];
  hasUses: boolean;
};

function findTokenVendor(
  tokenKey: string,
  npcs: CustomGData["npcs"] | undefined,
): UseMerchantRef | null {
  if (!npcs) return null;
  for (const [npcId, npc] of Object.entries(npcs)) {
    if (!npc?.token || npc.token !== tokenKey) continue;
    return { npcId, npcLabel: npc.name ?? npcId };
  }
  return null;
}

function findExchangeNpc(npcs: CustomGData["npcs"] | undefined): UseMerchantRef | undefined {
  if (!npcs) return undefined;
  for (const [npcId, npc] of Object.entries(npcs)) {
    if (npc?.role !== "exchange") continue;
    return { npcId, npcLabel: npc.name ?? npcId };
  }
  return undefined;
}

function toTokenSpendViews(tokenKey: ItemKey, G: CustomGData): UseTokenSpendView[] {
  const shop = (G.tokens as Record<string, Record<string, unknown>> | undefined)?.[tokenKey];
  if (!shop || typeof shop !== "object") return [];

  const tokenName = G.items[tokenKey]?.name ?? tokenKey;
  const vendor = findTokenVendor(tokenKey, G.npcs);
  const views: UseTokenSpendView[] = [];

  for (const [itemKey, costRaw] of Object.entries(shop)) {
    const cost =
      typeof costRaw === "number" && Number.isFinite(costRaw) ? costRaw : Number(costRaw);
    const finite = Number.isFinite(cost) ? cost : null;
    const normalized = normalizeTokenShopOffer(finite);
    const item = G.items[itemKey as ItemKey] as { name?: string } | undefined;
    const label = item?.name ?? itemKey;
    views.push({
      id: `token-spend-${itemKey}`,
      itemKey,
      label,
      secondary: label !== itemKey ? itemKey : undefined,
      cost: finite,
      tokenCost: normalized.tokenCost,
      quantity: normalized.quantity,
      costLabel:
        normalized.tokenCost > 0
          ? `${normalized.tokenCost.toLocaleString("en-US")} × ${tokenName}`
          : `? × ${tokenName}`,
      tokenKey,
      npcId: vendor?.npcId,
      npcLabel: vendor?.npcLabel,
      linkTo: `/items/${itemKey}`,
    });
  }

  return views.sort((a, b) => {
    if (a.tokenCost !== b.tokenCost) return a.tokenCost - b.tokenCost;
    if (a.quantity !== b.quantity) return b.quantity - a.quantity;
    return a.label.localeCompare(b.label);
  });
}

function groupTokenSpends(spends: UseTokenSpendView[]): UseTokenVendorGroup[] {
  if (spends.length === 0) return [];
  const groups = new Map<string, UseTokenVendorGroup>();
  for (const spend of spends) {
    const key = spend.npcId ?? spend.npcLabel ?? "_shop";
    const existing = groups.get(key);
    if (existing) {
      existing.spends.push(spend);
      continue;
    }
    groups.set(key, {
      npcId: spend.npcId,
      npcLabel: spend.npcLabel,
      spends: [spend],
    });
  }
  return [...groups.values()];
}

function toExchangeRewardViews(
  itemKey: ItemKey,
  items: GItems,
  allDrops: Record<string, unknown> | undefined,
): UseExchangeRewardView[] {
  const item = items[itemKey] as { e?: number; name?: string } | undefined;
  if (item?.e == null || !Number.isFinite(item.e)) return [];
  const table = allDrops?.[itemKey];
  if (!Array.isArray(table)) return [];

  const total = tableTotalWeight(table);
  const rows: DropSource[] = [];
  for (const entry of table) {
    const parsed = parseDropEntry("table", itemKey, entry, "weighted", total);
    for (const row of parsed) {
      if (row.nestedTable && row.probability != null && allDrops) {
        rows.push(
          ...expandOpenForAcquisition("table", itemKey, row.probability, row.nestedTable, allDrops),
        );
      } else if (row.itemKey) {
        rows.push(row);
      }
    }
  }

  const prepared = mergeDropSources(rows);
  return prepared
    .filter((row) => Boolean(row.itemKey))
    .map((row) => {
      const rewardKey = row.itemKey;
      const reward = items[rewardKey as ItemKey] as { name?: string } | undefined;
      const label =
        reward?.name ??
        (rewardKey === "gold" ? "Gold" : rewardKey === "shells" ? "Shells" : rewardKey);
      // Prefer summed probability (single label) — listing every open-path odd overflows the row.
      const oddsLabel =
        row.probability != null ? formatDropProbability(row.probability) : row.oddsLabel || "—";
      return {
        id: `exchange-out-${rewardKey}-${oddsLabel}`,
        itemKey: rewardKey,
        label,
        secondary: label !== rewardKey ? rewardKey : undefined,
        oddsLabel,
        linkTo: `/items/${rewardKey}`,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Item Uses — what you can spend / exchange this item for (token shops, exchange tables).
 * Craft "used in" stays on ItemDetail craft cards.
 */
export function getItemUses(itemKey: ItemKey, G: CustomGData): ItemUses {
  const tokenSpends = toTokenSpendViews(itemKey, G);
  const exchangeRewards = toExchangeRewardViews(
    itemKey,
    G.items,
    G.drops as Record<string, unknown> | undefined,
  );
  const exchangeNpc = exchangeRewards.length > 0 ? findExchangeNpc(G.npcs) : undefined;

  return {
    tokenVendors: groupTokenSpends(tokenSpends),
    tokenSpends,
    exchangeNpc,
    exchangeRewards,
    hasUses: tokenSpends.length > 0 || exchangeRewards.length > 0,
  };
}

const usesCache = new WeakMap<CustomGData, Map<string, ItemUses>>();

export function getItemUsesCached(itemKey: ItemKey, G: CustomGData): ItemUses {
  let byItem = usesCache.get(G);
  if (!byItem) {
    byItem = new Map();
    usesCache.set(G, byItem);
  }
  const hit = byItem.get(itemKey);
  if (hit) return hit;
  const next = getItemUses(itemKey, G);
  byItem.set(itemKey, next);
  return next;
}
