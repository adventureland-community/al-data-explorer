import axios from "axios";
import { useCallback, useEffect, useState } from "react";
import { ItemKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";

import {
  BuySellItemPrices,
  ItemsByNameTitleLevel,
  Merchant,
  MerchantsCache,
} from "./merchantTypes";

export function groupItemsByNameAndLevel(merchants: Merchant[]): ItemsByNameTitleLevel {
  const result: ItemsByNameTitleLevel = {};

  for (const merchant of merchants) {
    let tradeSlot: TradeSlotType;
    for (tradeSlot in merchant.slots) {
      if (!Object.hasOwn(merchant.slots, tradeSlot)) {
        continue;
      }

      const item = merchant.slots[tradeSlot] as TradeItemInfo;
      if (!item) {
        continue;
      }

      result[item.name] = result[item.name] ?? {};
      const itemPricesByName = result[item.name] ?? {};

      const titleKey = item.p ?? "";
      let itemPricesByTitle = itemPricesByName[titleKey];
      if (!itemPricesByTitle) {
        itemPricesByName[titleKey] = [];
        itemPricesByTitle = itemPricesByName[titleKey] ?? [];
      }

      const level = item.level ?? 0;
      let itemPricesByLevel = itemPricesByTitle[level];

      if (!itemPricesByLevel) {
        itemPricesByTitle[level] = {
          buying: {
            amount: 0,
            minPrice: { price: 0 },
            maxPrice: { price: 0 },
            avgPrice: 0,
            merchants: {},
          },
          selling: {
            amount: 0,
            minPrice: { price: 0 },
            maxPrice: { price: 0 },
            avgPrice: 0,
            merchants: {},
          },
        };
        itemPricesByLevel = itemPricesByTitle[level];
      }

      const buyingOrSelling: "buying" | "selling" = item.b ? "buying" : "selling";

      const itemsByBuyingOrSelling = itemPricesByLevel[buyingOrSelling];
      let itemsByMerchant = itemsByBuyingOrSelling.merchants[merchant.id];
      if (!itemsByMerchant) {
        const { id, lastSeen } = merchant;

        if (item.price) {
          if (
            itemsByBuyingOrSelling.minPrice.price === 0 ||
            itemsByBuyingOrSelling.minPrice.price > item.price
          ) {
            itemsByBuyingOrSelling.minPrice.merchant = id;
            itemsByBuyingOrSelling.minPrice.price = item.price;
          }

          if (
            itemsByBuyingOrSelling.maxPrice.price === 0 ||
            itemsByBuyingOrSelling.maxPrice.price < item.price
          ) {
            itemsByBuyingOrSelling.maxPrice.merchant = id;
            itemsByBuyingOrSelling.maxPrice.price = item.price;
          }
        }

        itemsByBuyingOrSelling.merchants[merchant.id] = {
          merchant: { id, lastSeen },
          items: [],
        };

        itemsByMerchant = itemsByBuyingOrSelling.merchants[merchant.id];
      }

      itemsByBuyingOrSelling.amount += item.q ?? 1;

      itemsByMerchant.items.push(item);
    }
  }

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
        .get<Merchant[]>("https://aldata.earthiverse.ca/merchants")
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
