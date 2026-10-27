import type {
  ListEntry,
  ListsDocument,
  ListShareSnapshot,
  ListType,
  NamedList,
  NewListEntryInput,
  ShoppingFilter,
} from "./types";

export const LISTS_STORAGE_KEY = "al-lists-v1";

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function emptyDoc(): ListsDocument {
  return {
    version: 1,
    lists: [],
    lastUsedWishlistId: null,
    lastUsedShoppingId: null,
  };
}

function seedDefaults(doc: ListsDocument): ListsDocument {
  if (doc.lists.length > 0) return doc;
  const wishlist: NamedList = {
    id: newId("list"),
    type: "wishlist",
    name: "Wishlist",
    entries: [],
    updatedAt: Date.now(),
  };
  const shopping: NamedList = {
    id: newId("list"),
    type: "shopping",
    name: "Shopping",
    entries: [],
    updatedAt: Date.now(),
  };
  return {
    ...doc,
    lists: [wishlist, shopping],
    lastUsedWishlistId: wishlist.id,
    lastUsedShoppingId: shopping.id,
  };
}

function parseEntry(raw: unknown): ListEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id !== "string") return null;
  const qty = typeof rec.qty === "number" && Number.isFinite(rec.qty) && rec.qty > 0 ? rec.qty : 1;
  const createdAt =
    typeof rec.createdAt === "number" && Number.isFinite(rec.createdAt)
      ? rec.createdAt
      : Date.now();
  const entry: ListEntry = { id: rec.id, qty, createdAt };
  if (typeof rec.itemKey === "string" && rec.itemKey) entry.itemKey = rec.itemKey;
  if (typeof rec.level === "number" && Number.isFinite(rec.level)) entry.level = rec.level;
  if (typeof rec.p === "string" && rec.p) entry.p = rec.p;
  if (typeof rec.stat_type === "string" && rec.stat_type) entry.stat_type = rec.stat_type;
  if (typeof rec.note === "string" && rec.note) entry.note = rec.note;
  if (rec.checked === true) entry.checked = true;
  return entry;
}

function parseList(raw: unknown): NamedList | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (typeof rec.id !== "string" || typeof rec.name !== "string") return null;
  if (rec.type !== "wishlist" && rec.type !== "shopping") return null;
  const entriesRaw = Array.isArray(rec.entries) ? rec.entries : [];
  const entries: ListEntry[] = [];
  for (const row of entriesRaw) {
    const parsed = parseEntry(row);
    if (parsed) entries.push(parsed);
  }
  return {
    id: rec.id,
    type: rec.type,
    name: rec.name.trim() || (rec.type === "wishlist" ? "Wishlist" : "Shopping"),
    entries,
    updatedAt:
      typeof rec.updatedAt === "number" && Number.isFinite(rec.updatedAt)
        ? rec.updatedAt
        : Date.now(),
  };
}

function parseDocument(raw: unknown): ListsDocument | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  if (rec.version !== 1) return null;
  const listsRaw = Array.isArray(rec.lists) ? rec.lists : [];
  const lists: NamedList[] = [];
  for (const row of listsRaw) {
    const parsed = parseList(row);
    if (parsed) lists.push(parsed);
  }
  return {
    version: 1,
    lists,
    lastUsedWishlistId: typeof rec.lastUsedWishlistId === "string" ? rec.lastUsedWishlistId : null,
    lastUsedShoppingId: typeof rec.lastUsedShoppingId === "string" ? rec.lastUsedShoppingId : null,
  };
}

function readRaw(): ListsDocument {
  try {
    const raw = localStorage.getItem(LISTS_STORAGE_KEY);
    if (!raw) return seedDefaults(emptyDoc());
    const parsed = parseDocument(JSON.parse(raw) as unknown);
    if (!parsed) return seedDefaults(emptyDoc());
    return seedDefaults(parsed);
  } catch {
    return seedDefaults(emptyDoc());
  }
}

function writeRaw(doc: ListsDocument): void {
  try {
    localStorage.setItem(LISTS_STORAGE_KEY, JSON.stringify(doc));
  } catch {
    // quota / private mode
  }
}

function touchList(list: NamedList): NamedList {
  return { ...list, updatedAt: Date.now() };
}

function replaceList(doc: ListsDocument, list: NamedList): ListsDocument {
  return {
    ...doc,
    lists: doc.lists.map((row) => (row.id === list.id ? list : row)),
  };
}

function resolveLastUsed(doc: ListsDocument, type: ListType): string | null {
  const preferred = type === "wishlist" ? doc.lastUsedWishlistId : doc.lastUsedShoppingId;
  if (preferred && doc.lists.some((l) => l.id === preferred && l.type === type)) {
    return preferred;
  }
  const first = doc.lists.find((l) => l.type === type);
  return first?.id ?? null;
}

export function loadListsDocument(): ListsDocument {
  const doc = readRaw();
  writeRaw(doc);
  return doc;
}

export function listsOfType(doc: ListsDocument, type: ListType): NamedList[] {
  return doc.lists.filter((l) => l.type === type);
}

export function getList(doc: ListsDocument, listId: string): NamedList | undefined {
  return doc.lists.find((l) => l.id === listId);
}

export function getLastUsedListId(doc: ListsDocument, type: ListType): string | null {
  return resolveLastUsed(doc, type);
}

export function setLastUsedList(type: ListType, listId: string): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId && l.type === type);
  if (!list) return doc;
  const next: ListsDocument =
    type === "wishlist"
      ? { ...doc, lastUsedWishlistId: listId }
      : { ...doc, lastUsedShoppingId: listId };
  writeRaw(next);
  return next;
}

export function createList(type: ListType, name: string): { doc: ListsDocument; list: NamedList } {
  const doc = readRaw();
  const list: NamedList = {
    id: newId("list"),
    type,
    name: name.trim() || (type === "wishlist" ? "Wishlist" : "Shopping"),
    entries: [],
    updatedAt: Date.now(),
  };
  let next: ListsDocument = { ...doc, lists: [...doc.lists, list] };
  if (type === "wishlist") next = { ...next, lastUsedWishlistId: list.id };
  else next = { ...next, lastUsedShoppingId: list.id };
  writeRaw(next);
  return { doc: next, list };
}

export function renameList(listId: string, name: string): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list) return doc;
  const next = replaceList(doc, touchList({ ...list, name: name.trim() || list.name }));
  writeRaw(next);
  return next;
}

/** Deletes the list and its entries. Caller should confirm in UI. */
export function deleteList(listId: string): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list) return doc;
  let next: ListsDocument = {
    ...doc,
    lists: doc.lists.filter((l) => l.id !== listId),
  };
  if (next.lastUsedWishlistId === listId) {
    next = {
      ...next,
      lastUsedWishlistId: next.lists.find((l) => l.type === "wishlist")?.id ?? null,
    };
  }
  if (next.lastUsedShoppingId === listId) {
    next = {
      ...next,
      lastUsedShoppingId: next.lists.find((l) => l.type === "shopping")?.id ?? null,
    };
  }
  // Re-seed if everything was deleted so the app always has defaults.
  next = seedDefaults(next.lists.length === 0 ? emptyDoc() : next);
  writeRaw(next);
  return next;
}

function buildEntry(input: NewListEntryInput): ListEntry {
  const qty =
    typeof input.qty === "number" && Number.isFinite(input.qty) && input.qty > 0 ? input.qty : 1;
  const entry: ListEntry = {
    id: newId("entry"),
    qty,
    createdAt: Date.now(),
  };
  if (input.itemKey) entry.itemKey = input.itemKey;
  if (typeof input.level === "number" && Number.isFinite(input.level)) entry.level = input.level;
  if (input.p) entry.p = input.p;
  if (input.stat_type) entry.stat_type = input.stat_type;
  if (input.note?.trim()) entry.note = input.note.trim();
  return entry;
}

export function addEntry(listId: string, input: NewListEntryInput): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list) return doc;
  if (!input.itemKey && !input.note?.trim()) return doc;
  const entry = buildEntry(input);
  const next = replaceList(doc, touchList({ ...list, entries: [entry, ...list.entries] }));
  const withLast =
    list.type === "wishlist"
      ? { ...next, lastUsedWishlistId: listId }
      : { ...next, lastUsedShoppingId: listId };
  writeRaw(withLast);
  return withLast;
}

export function addEntries(listId: string, inputs: NewListEntryInput[]): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list) return doc;
  const created: ListEntry[] = [];
  for (const input of inputs) {
    if (!input.itemKey && !input.note?.trim()) continue;
    created.push(buildEntry(input));
  }
  // Prepend so the first input is newest (first in newest-first order).
  const next = replaceList(doc, touchList({ ...list, entries: [...created, ...list.entries] }));
  const withLast =
    list.type === "wishlist"
      ? { ...next, lastUsedWishlistId: listId }
      : { ...next, lastUsedShoppingId: listId };
  writeRaw(withLast);
  return withLast;
}

export function updateEntry(
  listId: string,
  entryId: string,
  patch: Partial<NewListEntryInput> & { checked?: boolean },
): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list) return doc;
  const entries = list.entries.map((entry) => {
    if (entry.id !== entryId) return entry;
    const next: ListEntry = { ...entry };
    if (patch.itemKey !== undefined) {
      if (patch.itemKey) next.itemKey = patch.itemKey;
      else delete next.itemKey;
    }
    if (patch.level !== undefined) {
      if (typeof patch.level === "number" && Number.isFinite(patch.level)) next.level = patch.level;
      else delete next.level;
    }
    if (patch.p !== undefined) {
      if (patch.p) next.p = patch.p;
      else delete next.p;
    }
    if (patch.stat_type !== undefined) {
      if (patch.stat_type) next.stat_type = patch.stat_type;
      else delete next.stat_type;
    }
    if (patch.qty !== undefined && typeof patch.qty === "number" && patch.qty > 0) {
      next.qty = patch.qty;
    }
    if (patch.note !== undefined) {
      if (patch.note.trim()) next.note = patch.note.trim();
      else delete next.note;
    }
    if (list.type === "shopping" && patch.checked !== undefined) {
      if (patch.checked) next.checked = true;
      else delete next.checked;
    }
    return next;
  });
  const next = replaceList(doc, touchList({ ...list, entries }));
  writeRaw(next);
  return next;
}

export function removeEntry(listId: string, entryId: string): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list) return doc;
  const next = replaceList(
    doc,
    touchList({ ...list, entries: list.entries.filter((e) => e.id !== entryId) }),
  );
  writeRaw(next);
  return next;
}

export function setEntryChecked(listId: string, entryId: string, checked: boolean): ListsDocument {
  return updateEntry(listId, entryId, { checked });
}

/**
 * Copy a wishlist entry onto a shopping list (wishlist row stays).
 * Defaults to last-used shopping list.
 */
export function promoteEntry(
  wishlistId: string,
  entryId: string,
  shoppingListId?: string,
): ListsDocument {
  const doc = readRaw();
  const wishlist = doc.lists.find((l) => l.id === wishlistId && l.type === "wishlist");
  if (!wishlist) return doc;
  const entry = wishlist.entries.find((e) => e.id === entryId);
  if (!entry) return doc;
  const targetId = shoppingListId ?? resolveLastUsed(doc, "shopping");
  if (!targetId) return doc;
  const shopping = doc.lists.find((l) => l.id === targetId && l.type === "shopping");
  if (!shopping) return doc;

  const copy: ListEntry = {
    id: newId("entry"),
    qty: entry.qty,
    createdAt: Date.now(),
  };
  if (entry.itemKey) copy.itemKey = entry.itemKey;
  if (entry.level != null) copy.level = entry.level;
  if (entry.p) copy.p = entry.p;
  if (entry.stat_type) copy.stat_type = entry.stat_type;
  if (entry.note) copy.note = entry.note;

  let next = replaceList(doc, touchList({ ...shopping, entries: [copy, ...shopping.entries] }));
  next = { ...next, lastUsedShoppingId: shopping.id };
  writeRaw(next);
  return next;
}

export function filterShoppingEntries(entries: ListEntry[], filter: ShoppingFilter): ListEntry[] {
  if (filter === "all") return entries;
  if (filter === "bought") return entries.filter((e) => e.checked);
  return entries.filter((e) => !e.checked);
}

/** Entries newest-first (createdAt desc). Store already prepends; this is for display. */
export function sortEntriesNewestFirst(entries: ListEntry[]): ListEntry[] {
  return [...entries].sort((a, b) => b.createdAt - a.createdAt);
}

export function appendImportedEntries(listId: string, snapshot: ListShareSnapshot): ListsDocument {
  const doc = readRaw();
  const list = doc.lists.find((l) => l.id === listId);
  if (!list || list.type !== snapshot.type) return doc;
  const inputs: NewListEntryInput[] = snapshot.entries.map((row) => ({
    itemKey: row.itemKey,
    level: row.level,
    p: row.p,
    stat_type: row.stat_type,
    qty: row.qty,
    note: row.note,
  }));
  return addEntries(listId, inputs);
}

export function importSnapshotAsNewList(snapshot: ListShareSnapshot): {
  doc: ListsDocument;
  list: NamedList;
} {
  const { list } = createList(snapshot.type, snapshot.name);
  const doc = appendImportedEntries(list.id, snapshot);
  const refreshed = doc.lists.find((l) => l.id === list.id) ?? list;
  return { doc, list: refreshed };
}

/** Resolve destination for add/promote: last-used of type, or create default namespace list. */
export function ensureDestinationList(type: ListType): { doc: ListsDocument; listId: string } {
  const doc = loadListsDocument();
  const existing = resolveLastUsed(doc, type);
  if (existing) return { doc, listId: existing };
  const { doc: next, list } = createList(type, type === "wishlist" ? "Wishlist" : "Shopping");
  return { doc: next, listId: list.id };
}
