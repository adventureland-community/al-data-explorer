/** Wishlist (long-term want) vs shopping list (buy-now). Separate namespaces. */
export type ListType = "wishlist" | "shopping";

export type ShoppingFilter = "active" | "bought" | "all";

/**
 * One row on a wishlist or shopping list.
 * Free-text = no `itemKey`. Instance fields (level, Title `p`, Stat scroll) are optional.
 */
export type ListEntry = {
  id: string;
  itemKey?: string;
  level?: number;
  /** Title key (`item.p`), e.g. Lucky / Festive. */
  p?: string;
  /** Stat scroll attribute (`item.stat_type`). */
  stat_type?: string;
  qty: number;
  note?: string;
  /** Shopping lists only: checked off / bought. */
  checked?: boolean;
  createdAt: number;
};

export type NamedList = {
  id: string;
  type: ListType;
  name: string;
  entries: ListEntry[];
  updatedAt: number;
};

export type ListsDocument = {
  version: 1;
  lists: NamedList[];
  lastUsedWishlistId: string | null;
  lastUsedShoppingId: string | null;
};

/** Snapshot carried in `/lists?list=` share links (one list). */
export type ListShareSnapshot = {
  type: ListType;
  name: string;
  entries: Array<{
    itemKey?: string;
    level?: number;
    p?: string;
    stat_type?: string;
    qty: number;
    note?: string;
  }>;
};

export type NewListEntryInput = {
  itemKey?: string;
  level?: number;
  p?: string;
  stat_type?: string;
  qty?: number;
  note?: string;
};
