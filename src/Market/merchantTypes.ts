import { ItemKey, MapKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";

/** Official AL stand barter target (`trade_offer` / OFFER FOR TRADE). */
export type MerchantWant = {
  name: string;
  level?: number;
  q?: number;
  p?: string;
  data?: string;
};

/** Merchant slot payload from ALData `/merchants` (gold and/or `want`). */
export type MerchantTradeItem = TradeItemInfo & {
  want?: MerchantWant;
  /** Free-form instance payload (e.g. cxjar cosmetic id). */
  data?: string;
};

export type ItemPrices = {
  amount: number;
  /** Sum of `price * qty` for gold listings (for qty-weighted avg). */
  goldValueSum: number;
  /** Total qty across gold listings. */
  goldQty: number;
  goldOfferCount: number;
  wantOfferCount: number;
  minPrice: { merchant?: string; price: number };
  maxPrice: { merchant?: string; price: number };
  avgPrice: number;
  merchants: {
    [merchantName: string]: {
      merchant: { id: string; lastSeen: string };
      items: MerchantTradeItem[];
    };
  };
};

export type IncomingWantOffer = {
  merchantName: string;
  /** Item on their stand they will give. */
  offered: MerchantTradeItem;
  want: MerchantWant;
};

export type BuySellItemPrices = {
  buying: ItemPrices;
  selling: ItemPrices;
  /**
   * Other merchants' stand barters that ask for this item
   * (their slot item is what you receive).
   */
  wantedBy: IncomingWantOffer[];
};

/**
 * Nested as item → variant (`${p}\0${data}`) → level → buy/sell prices.
 * Variant matches server `can_stack` (titles + cxjar.data stay separate).
 */
export type ItemsByNameTitleLevel = Partial<
  Record<ItemKey, Partial<Record<string, BuySellItemPrices[]>>>
>;

export type Merchant = {
  id: string;
  lastSeen: string;
  map: MapKey;
  serverIdentifier: string;
  serverRegion: string;
  slots: { [T in TradeSlotType]?: MerchantTradeItem };
  x: number;
  y: number;
};

export type MerchantsCache = {
  timestamp: string;
  merchants: Merchant[];
};
