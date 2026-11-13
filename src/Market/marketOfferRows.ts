import type { TradeRow } from "../Trades/tradeViewModel";
import type { BuySellItemPrices, MerchantTradeItem, MerchantWant } from "./merchantTypes";

export type OfferSource = "stand" | "earth";

export type GoldOfferRow = {
  id: string;
  merchantName: string;
  quantity: number;
  price: number;
  item: MerchantTradeItem;
  /** How many stand slots / listings were combined into this row. */
  slotCount: number;
  source: OfferSource;
};

export type WantOfferRow = {
  id: string;
  merchantName: string;
  quantity: number;
  item: MerchantTradeItem;
  /** Direction from the viewed item's perspective. */
  direction: "giving" | "receiving";
  slotCount: number;
  source: OfferSource;
};

/** Merchant perspective: they sell `give`, want `receive` in return. */
export type WantTradeSides = {
  give: { name: string; level?: number; q?: number; p?: string; data?: string };
  receive: { name: string; level?: number; q?: number; p?: string; data?: string };
};

export function wantTradeSides(
  row: WantOfferRow,
  viewedItem: { name: string; level?: number },
): WantTradeSides | null {
  const { want } = row.item;
  if (!want?.name) return null;

  if (row.direction === "giving") {
    // Viewed item is what they offer; `want` is what they ask for.
    return {
      give: {
        name: row.item.name,
        level: row.item.level,
        q: row.quantity,
        p: row.item.p,
        data: row.item.data,
      },
      receive: {
        name: want.name,
        level: want.level,
        q: want.q ?? 1,
        p: want.p,
        data: want.data,
      },
    };
  }

  // Incoming: they offer `row.item` and want the viewed item.
  return {
    give: {
      name: row.item.name,
      level: row.item.level,
      q: row.quantity,
      p: row.item.p,
      data: row.item.data,
    },
    receive: {
      name: viewedItem.name,
      level: viewedItem.level ?? want.level,
      q: want.q ?? 1,
      p: want.p,
      data: want.data,
    },
  };
}

function wantKey(want: MerchantWant | undefined): string {
  if (!want?.name) return "";
  return `${want.name}|${want.level ?? 0}|${want.p ?? ""}|${want.data ?? ""}`;
}

function itemKey(item: MerchantTradeItem): string {
  return `${item.name}|${item.level ?? 0}|${item.p ?? ""}|${item.data ?? ""}`;
}

/** Same merchant + same gold price + same source → one row with summed qty. */
export function combineGoldOffers(rows: GoldOfferRow[]): GoldOfferRow[] {
  const map = new Map<string, GoldOfferRow>();
  for (const row of rows) {
    const key = `${row.source}|${row.merchantName}|${row.price}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      existing.slotCount += row.slotCount;
    } else {
      map.set(key, { ...row });
    }
  }
  return Array.from(map.values());
}

/** Same merchant + same offered item + same want target + source → one row. */
export function combineWantOffers(rows: WantOfferRow[]): WantOfferRow[] {
  const map = new Map<string, WantOfferRow>();
  for (const row of rows) {
    const key = `${row.source}|${row.merchantName}|${row.direction}|${itemKey(row.item)}|${wantKey(
      row.item.want,
    )}`;
    const existing = map.get(key);
    if (existing) {
      existing.quantity += row.quantity;
      existing.slotCount += row.slotCount;
    } else {
      map.set(key, { ...row });
    }
  }
  return Array.from(map.values());
}

function goldIdentityKey(row: GoldOfferRow): string {
  return `${row.merchantName}|${row.price}`;
}

function wantIdentityKey(row: WantOfferRow): string {
  return `${row.merchantName}|${row.direction}|${itemKey(row.item)}|${wantKey(row.item.want)}`;
}

/**
 * When the same merchant already lists the same gold price on a stand,
 * drop the duplicate Earth `/trades` row.
 */
export function preferStandOverEarthGold(rows: GoldOfferRow[]): GoldOfferRow[] {
  const standKeys = new Set(
    rows.filter((row) => row.source === "stand").map((row) => goldIdentityKey(row)),
  );
  return rows.filter((row) => row.source !== "earth" || !standKeys.has(goldIdentityKey(row)));
}

/**
 * When the same merchant already lists the same barter on a stand,
 * drop the duplicate Earth `/trades` row.
 */
export function preferStandOverEarthWant(rows: WantOfferRow[]): WantOfferRow[] {
  const standKeys = new Set(
    rows.filter((row) => row.source === "stand").map((row) => wantIdentityKey(row)),
  );
  return rows.filter((row) => row.source !== "earth" || !standKeys.has(wantIdentityKey(row)));
}

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
          slotCount: 1,
          source: "stand",
        });
      }
      if (hasWant) {
        want.push({
          id: `${side}-want-${merchantName}-${index}-${item.want?.name}`,
          merchantName,
          quantity,
          item,
          direction: "giving",
          slotCount: 1,
          source: "stand",
        });
      }
    }
  }

  const combinedGold = combineGoldOffers(gold);
  combinedGold.sort((a, b) => (side === "buying" ? b.price - a.price : a.price - b.price));
  return { gold: combinedGold, want: combineWantOffers(want) };
}

/**
 * Fold Earth ALData `/trades` rows for this item into gold + item-barter panels.
 * - Gold WTB → buying; gold WTS → selling (source: earth)
 * - Item trades on WTS → offering this; on WTB → want this
 */
export function listedTradesToOffers(
  listedRows: TradeRow[],
  viewedItem: { name: string; level?: number; p?: string },
): {
  buyGold: GoldOfferRow[];
  sellGold: GoldOfferRow[];
  outgoingWant: WantOfferRow[];
  incomingWant: WantOfferRow[];
} {
  const buyGold: GoldOfferRow[] = [];
  const sellGold: GoldOfferRow[] = [];
  const outgoingWant: WantOfferRow[] = [];
  const incomingWant: WantOfferRow[] = [];

  for (const [index, row] of listedRows.entries()) {
    const qty = row.tradeSide.quantity ?? 1;
    const listingItem = {
      name: row.listing.name,
      level: row.listing.level ?? viewedItem.level,
      p: row.listing.p,
      q: qty,
    } as MerchantTradeItem;

    if (typeof row.tradeSide.price === "number" && row.tradeSide.price > 0) {
      const goldRow: GoldOfferRow = {
        id: `earth-gold-${row.side}-${row.owner}-${index}-${row.tradeSide.price}`,
        merchantName: row.ownerLabel,
        quantity: qty,
        price: row.tradeSide.price,
        item: { ...listingItem, price: row.tradeSide.price },
        slotCount: 1,
        source: "earth",
      };
      if (row.side === "WTB") buyGold.push(goldRow);
      else sellGold.push(goldRow);
    }

    const trades = row.tradeSide.trades ?? [];
    for (const [tIndex, offer] of trades.entries()) {
      if (!offer.item?.name) continue;

      if (row.side === "WTS") {
        // Offering listed item for offer.item
        outgoingWant.push({
          id: `earth-wts-${row.owner}-${index}-${tIndex}-${offer.item.name}`,
          merchantName: row.ownerLabel,
          quantity: offer.give,
          item: {
            ...listingItem,
            q: offer.give,
            want: {
              name: offer.item.name,
              level: offer.item.level,
              p: offer.item.p,
              q: offer.receive,
            },
          },
          direction: "giving",
          slotCount: 1,
          source: "earth",
        });
      } else {
        // WTB: owner gives offer.item, wants listed item
        incomingWant.push({
          id: `earth-wtb-${row.owner}-${index}-${tIndex}-${offer.item.name}`,
          merchantName: row.ownerLabel,
          quantity: offer.receive,
          item: {
            name: offer.item.name,
            level: offer.item.level,
            p: offer.item.p,
            q: offer.receive,
            want: {
              name: row.listing.name,
              level: row.listing.level ?? viewedItem.level,
              p: row.listing.p,
              q: offer.give,
            },
          } as MerchantTradeItem,
          direction: "receiving",
          slotCount: 1,
          source: "earth",
        });
      }
    }
  }

  return {
    buyGold: combineGoldOffers(buyGold),
    sellGold: combineGoldOffers(sellGold),
    outgoingWant: combineWantOffers(outgoingWant),
    incomingWant: combineWantOffers(incomingWant),
  };
}

export function splitMarketOffers(
  prices: BuySellItemPrices,
  listedRows: TradeRow[] = [],
  viewedItem?: { name: string; level?: number; p?: string },
) {
  const buying = flattenSide(prices, "buying");
  const selling = flattenSide(prices, "selling");

  const standIncoming: WantOfferRow[] = prices.wantedBy.map((entry, index) => ({
    id: `incoming-${entry.merchantName}-${index}-${entry.offered.name}`,
    merchantName: entry.merchantName,
    quantity: entry.offered.q ?? 1,
    item: entry.offered,
    direction: "receiving" as const,
    slotCount: 1,
    source: "stand" as const,
  }));

  const earth = viewedItem
    ? listedTradesToOffers(listedRows, viewedItem)
    : { buyGold: [], sellGold: [], outgoingWant: [], incomingWant: [] };

  const buyGold = preferStandOverEarthGold(combineGoldOffers([...buying.gold, ...earth.buyGold]));
  buyGold.sort((a, b) => b.price - a.price);
  const sellGold = preferStandOverEarthGold(
    combineGoldOffers([...selling.gold, ...earth.sellGold]),
  );
  sellGold.sort((a, b) => a.price - b.price);

  return {
    buyGold,
    sellGold,
    /** Barters offering the viewed item (stand + Earth WTS item trades). */
    outgoingWant: preferStandOverEarthWant(
      combineWantOffers([...buying.want, ...selling.want, ...earth.outgoingWant]),
    ),
    /** Barters wanting the viewed item (stand reverse-index + Earth WTB item trades). */
    incomingWant: preferStandOverEarthWant(
      combineWantOffers([...standIncoming, ...earth.incomingWant]),
    ),
  };
}
