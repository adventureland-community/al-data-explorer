import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { ItemKey, TradeSlotType } from "typed-adventureland";

import { ALDATA_BASE_URL } from "../aldataBaseUrl";
import { instanceVariantKey } from "../gameData/itemInstanceData";
import {
  BuySellItemPrices,
  ItemPrices,
  ItemsByNameTitleLevel,
  Merchant,
  MerchantTradeItem,
  MerchantsCache,
} from "./merchantTypes";

function emptySide(): ItemPrices {
  return {
    amount: 0,
    goldValueSum: 0,
    goldQty: 0,
    goldOfferCount: 0,
    wantOfferCount: 0,
    minPrice: { price: 0 },
    maxPrice: { price: 0 },
    avgPrice: 0,
    merchants: {},
  };
}

export function emptyBuySellPrices(): BuySellItemPrices {
  return {
    buying: emptySide(),
    selling: emptySide(),
    wantedBy: [],
  };
}

function ensureLevelBucket(
  result: ItemsByNameTitleLevel,
  itemName: ItemKey,
  variantKey: string,
  level: number,
): BuySellItemPrices {
  result[itemName] = result[itemName] ?? {};
  const byVariant = result[itemName] ?? {};
  byVariant[variantKey] = byVariant[variantKey] ?? [];
  const byLevel = byVariant[variantKey] ?? [];
  if (!byLevel[level]) {
    byLevel[level] = emptyBuySellPrices();
  }
  return byLevel[level];
}

function recordGoldPrice(side: ItemPrices, merchantId: string, price: number) {
  if (side.minPrice.price === 0 || side.minPrice.price > price) {
    side.minPrice = { merchant: merchantId, price };
  }
  if (side.maxPrice.price === 0 || side.maxPrice.price < price) {
    side.maxPrice = { merchant: merchantId, price };
  }
}

function finalizeAverages(result: ItemsByNameTitleLevel) {
  for (const byVariant of Object.values(result)) {
    if (!byVariant) continue;
    for (const byLevel of Object.values(byVariant)) {
      if (!byLevel) continue;
      for (const prices of byLevel) {
        if (!prices) continue;
        for (const side of [prices.buying, prices.selling]) {
          side.avgPrice = side.goldQty > 0 ? side.goldValueSum / side.goldQty : 0;
        }
      }
    }
  }
}

export function groupItemsByNameAndLevel(merchants: Merchant[]): ItemsByNameTitleLevel {
  const result: ItemsByNameTitleLevel = {};

  for (const merchant of merchants) {
    let tradeSlot: TradeSlotType;
    for (tradeSlot in merchant.slots) {
      if (!Object.hasOwn(merchant.slots, tradeSlot)) {
        continue;
      }

      const item = merchant.slots[tradeSlot] as MerchantTradeItem | undefined;
      if (!item) {
        continue;
      }

      const variantKey = instanceVariantKey(item);
      const level = item.level ?? 0;
      const itemPricesByLevel = ensureLevelBucket(result, item.name as ItemKey, variantKey, level);

      const buyingOrSelling: "buying" | "selling" = item.b ? "buying" : "selling";
      const side = itemPricesByLevel[buyingOrSelling];
      const qty = item.q ?? 1;
      const hasGold = typeof item.price === "number" && item.price > 0;
      const hasWant = item.want != null && typeof item.want.name === "string";

      let itemsByMerchant = side.merchants[merchant.id];
      if (!itemsByMerchant) {
        side.merchants[merchant.id] = {
          merchant: { id: merchant.id, lastSeen: merchant.lastSeen },
          items: [],
        };
        itemsByMerchant = side.merchants[merchant.id];
      }

      side.amount += qty;
      if (hasGold) {
        recordGoldPrice(side, merchant.id, item.price);
        side.goldValueSum += item.price * qty;
        side.goldQty += qty;
        side.goldOfferCount += 1;
      }
      if (hasWant) {
        side.wantOfferCount += 1;
      }

      itemsByMerchant.items.push(item);

      // Index reverse barters: stand offers something else, wants this item.
      if (hasWant && item.want) {
        const wantVariant = instanceVariantKey(item.want);
        const wantLevel = item.want.level ?? 0;
        const wantBucket = ensureLevelBucket(
          result,
          item.want.name as ItemKey,
          wantVariant,
          wantLevel,
        );
        wantBucket.wantedBy.push({
          merchantName: merchant.id,
          offered: item,
          want: item.want,
        });
      }
    }
  }

  finalizeAverages(result);
  return result;
}

function merchantsRecord(merchants: Merchant[]): Record<string, Merchant> {
  return merchants.reduce((acc: Record<string, Merchant>, merchant: Merchant) => {
    acc[merchant.id] = merchant;
    return acc;
  }, {});
}

function applyMerchants(
  merchants: Merchant[],
  setItems: (items: ItemsByNameTitleLevel) => void,
  setMerchants: (merchants: Record<string, Merchant>) => void,
  setLastRefresh: (date: Date) => void,
  timestamp?: Date,
) {
  setLastRefresh(timestamp ?? new Date());
  setItems(groupItemsByNameAndLevel(merchants));
  setMerchants(merchantsRecord(merchants));
}

export function useMerchants() {
  const [lastRefresh, setLastRefresh] = useState<Date | undefined>(undefined);
  const [items, setItems] = useState<ItemsByNameTitleLevel>({});
  const [merchants, setMerchants] = useState<Record<string, Merchant>>({});

  const refresh = useCallback(
    () =>
      axios
        .get<Merchant[]>(`${ALDATA_BASE_URL}/merchants`)
        .then((response) => {
          applyMerchants(response.data, setItems, setMerchants, setLastRefresh);
          const cache: MerchantsCache = {
            timestamp: new Date().toISOString(),
            merchants: response.data,
          };
          sessionStorage.setItem("merchants", JSON.stringify(cache));
        })
        .catch((error) => {
          console.log(error);
        }),
    [],
  );

  useEffect(() => {
    const cached = sessionStorage.getItem("merchants");
    if (cached) {
      const parsed = JSON.parse(cached) as MerchantsCache;
      applyMerchants(
        parsed.merchants,
        setItems,
        setMerchants,
        setLastRefresh,
        new Date(parsed.timestamp),
      );
      return;
    }
    refresh();
  }, [refresh]);

  const getItemMarketSummary = useCallback(
    (itemKey: ItemKey) => {
      const byTitle = items[itemKey];
      if (!byTitle) return { buyers: 0, sellers: 0 };
      let buyers = 0;
      let sellers = 0;
      for (const byLevel of Object.values(byTitle)) {
        if (!byLevel) continue;
        for (const prices of byLevel) {
          if (!prices) continue;
          buyers += Object.keys(prices.buying.merchants).length;
          sellers += Object.keys(prices.selling.merchants).length;
        }
      }
      return { buyers, sellers };
    },
    [items],
  );

  return {
    items,
    merchants,
    lastRefresh,
    refresh,
    getItemMarketSummary,
  };
}

export type { BuySellItemPrices, ItemsByNameTitleLevel, Merchant };
