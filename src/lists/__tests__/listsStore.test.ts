import {
  addEntry,
  createList,
  deleteList,
  filterShoppingEntries,
  getLastUsedListId,
  loadListsDocument,
  LISTS_STORAGE_KEY,
  promoteEntry,
  renameList,
  setEntryChecked,
  setLastUsedList,
} from "../listsStore";

describe("listsStore", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memory.set(k, v);
        },
        removeItem: (k: string) => {
          memory.delete(k);
        },
      },
    });
  });

  it("seeds one wishlist and one shopping list when empty", () => {
    const doc = loadListsDocument();
    expect(doc.lists).toHaveLength(2);
    expect(doc.lists.map((l) => l.type).sort()).toStrictEqual(["shopping", "wishlist"]);
    expect(doc.lastUsedWishlistId).toBeTruthy();
    expect(doc.lastUsedShoppingId).toBeTruthy();
    expect(memory.get(LISTS_STORAGE_KEY)).toBeTruthy();
  });

  it("creates, renames, and deletes lists", () => {
    loadListsDocument();
    const { list } = createList("wishlist", "Event gear");
    expect(renameList(list.id, "Event").lists.find((l) => l.id === list.id)?.name).toBe("Event");
    const after = deleteList(list.id);
    expect(after.lists.find((l) => l.id === list.id)).toBeUndefined();
  });

  it("re-seeds defaults after deleting every list", () => {
    const doc = loadListsDocument();
    let next = doc;
    for (const list of doc.lists) {
      next = deleteList(list.id);
    }
    expect(next.lists.length).toBeGreaterThanOrEqual(2);
  });

  it("adds catalog and free-text entries without merging duplicates", () => {
    const doc = loadListsDocument();
    const wishlistId = getLastUsedListId(doc, "wishlist")!;
    addEntry(wishlistId, { itemKey: "firestaff", qty: 1 });
    addEntry(wishlistId, { itemKey: "firestaff", level: 9, p: "lucky", qty: 1 });
    addEntry(wishlistId, { note: "Buy potions at town", qty: 1 });
    const list = loadListsDocument().lists.find((l) => l.id === wishlistId)!;
    expect(list.entries).toHaveLength(3);
  });

  it("promotes by copying onto last-used shopping list", () => {
    const doc = loadListsDocument();
    const wishlistId = getLastUsedListId(doc, "wishlist")!;
    const shoppingId = getLastUsedListId(doc, "shopping")!;
    addEntry(wishlistId, { itemKey: "helmet", level: 7, qty: 2, note: "main" });
    const entryId = loadListsDocument().lists.find((l) => l.id === wishlistId)!.entries[0]!.id;
    promoteEntry(wishlistId, entryId);
    const after = loadListsDocument();
    const wish = after.lists.find((l) => l.id === wishlistId)!;
    const shop = after.lists.find((l) => l.id === shoppingId)!;
    expect(wish.entries).toHaveLength(1);
    expect(shop.entries).toHaveLength(1);
    expect(shop.entries[0]?.itemKey).toBe("helmet");
    expect(shop.entries[0]?.level).toBe(7);
    expect(shop.entries[0]?.qty).toBe(2);
    expect(shop.entries[0]?.id).not.toBe(entryId);
  });

  it("checks off shopping rows and filters Active / Bought / All", () => {
    const doc = loadListsDocument();
    const shoppingId = getLastUsedListId(doc, "shopping")!;
    addEntry(shoppingId, { itemKey: "scroll0", qty: 3 });
    addEntry(shoppingId, { itemKey: "scroll1", qty: 1 });
    const { entries: seeded } = loadListsDocument().lists.find((l) => l.id === shoppingId)!;
    const [first, second] = seeded;
    setEntryChecked(shoppingId, first!.id, true);
    const { entries } = loadListsDocument().lists.find((l) => l.id === shoppingId)!;
    expect(filterShoppingEntries(entries, "active")).toHaveLength(1);
    expect(filterShoppingEntries(entries, "bought")).toHaveLength(1);
    expect(filterShoppingEntries(entries, "all")).toHaveLength(2);
    expect(filterShoppingEntries(entries, "bought")[0]?.id).toBe(first!.id);
    expect(filterShoppingEntries(entries, "active")[0]?.id).toBe(second!.id);
  });

  it("tracks last-used ids per type", () => {
    loadListsDocument();
    const { list } = createList("shopping", "Tonight");
    expect(getLastUsedListId(loadListsDocument(), "shopping")).toBe(list.id);
    const other = createList("shopping", "Alt").list;
    setLastUsedList("shopping", other.id);
    expect(getLastUsedListId(loadListsDocument(), "shopping")).toBe(other.id);
  });
});
