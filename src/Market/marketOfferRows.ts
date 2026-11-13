import type { BuySellItemPrices, MerchantTradeItem } from "./merchantTypes";

export type GoldOfferRow = {
  id: string;
  merchantName: string;
  quantity: number;
  price: number;
  item: MerchantTradeItem;
};

export type WantOfferRow = {
  id: string;
  merchantName: string;
  quantity: number;
  item: MerchantTradeItem;
  /** Direction from the viewed item's perspective. */
  direction: "giving" | "receiving";
};

function flattenSide(
  prices: BuySellItemPrices,
  side: "buying" | "selling",
): { gold: GoldOfferRow[]; want: WantOfferRow[] } {
  const gold: GoldOfferRow[] = [];
  const want: WantOfferRow[] = [];

  for (const [merchantName, entry] of Object.entries(prices[side].merchants)) {
    for (const [index, item] of entry.items.entries()) {
      const quantity = item.q ?? 1;
      const hasGold = typeof item.price === "number" && item.price > 0;
      const hasWant = item.want != null && typeof item.want.name === "string";

      if (hasGold) {
        gold.push({
          id: `${side}-gold-${merchantName}-${index}-${item.price}`,
          merchantName,
          quantity,
          price: item.price,
          item,
        });
      }
      if (hasWant) {
        want.push({
          id: `${side}-want-${merchantName}-${index}-${item.want?.name}`,
          merchantName,
          quantity,
          item,
          direction: "giving",
        });
      }
    }
  }

  gold.sort((a, b) => (side === "buying" ? b.price - a.price : a.price - b.price));
  return { gold, want };
}

export function splitMarketOffers(prices: BuySellItemPrices) {
  const buying = flattenSide(prices, "buying");
  const selling = flattenSide(prices, "selling");

  const incomingWant: WantOfferRow[] = prices.wantedBy.map((entry, index) => ({
    id: `incoming-${entry.merchantName}-${index}-${entry.offered.name}`,
    merchantName: entry.merchantName,
    quantity: entry.offered.q ?? 1,
    item: entry.offered,
    direction: "receiving",
  }));

  return {
    buyGold: buying.gold,
    sellGold: selling.gold,
    /** Stand barters where this item is on their stand. */
    outgoingWant: [...buying.want, ...selling.want],
    /** Stand barters where someone else wants this item. */
    incomingWant,
  };
}
