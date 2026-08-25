import { ItemKey, MapKey, TitleKey, TradeItemInfo, TradeSlotType } from "typed-adventureland";

export type ItemPrices = {
  amount: number;
  minPrice: { merchant?: string; price: number };
  maxPrice: { merchant?: string; price: number };
  avgPrice: number;
  merchants: {
    [merchantName: string]: {
      merchant: { id: string; lastSeen: string };
      items: TradeItemInfo[];
    };
  };
};

export type BuySellItemPrices = {
  buying: ItemPrices;
  selling: ItemPrices;
};

export type ItemsByNameTitleLevel = Partial<
  Record<ItemKey, Partial<Record<TitleKey | "", BuySellItemPrices[]>>>
>;

export type Merchant = {
  id: string;
  lastSeen: string;
  map: MapKey;
  serverIdentifier: string;
  serverRegion: string;
  slots: { [T in TradeSlotType]?: TradeItemInfo };
  x: number;
  y: number;
};

export type MerchantsCache = {
  timestamp: string;
  merchants: Merchant[];
};
