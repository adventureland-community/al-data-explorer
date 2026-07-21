export type ItemRef = { name: string; level?: number; p?: string };

export type TradeOffer = { item: ItemRef; give: number; receive: number; negotiable?: boolean };

export type TradeSide = {
  price?: number;
  priceNegotiable?: boolean;
  note?: string;
  quantity?: number;
  trades?: TradeOffer[];
};

export type TradeListing = ItemRef & { note?: string; wts?: TradeSide; wtb?: TradeSide };

export type OwnerTrades = {
  owner: string;
  listings: TradeListing[];
  lastUpdated?: number;
  characters?: string[];
  /** Short display name derived from characters (e.g. "earth"). */
  label?: string;
};

export type OwnerTradesResponse = {
  listings: TradeListing[];
  lastUpdated?: number;
  characters?: string[];
  label?: string;
};
