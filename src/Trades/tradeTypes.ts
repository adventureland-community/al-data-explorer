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
  /** Short display name: preferred displayName, else derived from characters. */
  label?: string;
  /** Explicit preferred name set via PUT /trades (applies to all listings). */
  displayName?: string;
  /** Discord username / display name (plain text). */
  discordName?: string;
  /** Discord snowflake for copy-paste mentions. */
  discordId?: string;
};

export type OwnerTradesResponse = {
  listings: TradeListing[];
  lastUpdated?: number;
  characters?: string[];
  label?: string;
  displayName?: string;
  discordName?: string;
  discordId?: string;
};
