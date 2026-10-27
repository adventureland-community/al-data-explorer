import LZString from "lz-string";

import type { ListShareSnapshot, ListType, NamedList } from "./types";

function sanitizeSnapshotEntries(type: ListType, list: NamedList): ListShareSnapshot["entries"] {
  const source = type === "shopping" ? list.entries.filter((e) => !e.checked) : list.entries;
  const out: ListShareSnapshot["entries"] = [];
  for (const entry of source) {
    if (!entry.itemKey && !entry.note) continue;
    const row: ListShareSnapshot["entries"][number] = {
      qty: entry.qty > 0 ? entry.qty : 1,
    };
    if (entry.itemKey) row.itemKey = entry.itemKey;
    if (entry.level != null) row.level = entry.level;
    if (entry.p) row.p = entry.p;
    if (entry.stat_type) row.stat_type = entry.stat_type;
    if (entry.note) row.note = entry.note;
    out.push(row);
  }
  return out;
}

export function listToShareSnapshot(list: NamedList): ListShareSnapshot {
  return {
    type: list.type,
    name: list.name,
    entries: sanitizeSnapshotEntries(list.type, list),
  };
}

export function encodeListShareSnapshot(snapshot: ListShareSnapshot): string {
  return LZString.compressToEncodedURIComponent(JSON.stringify(snapshot));
}

export function decodeListShareSnapshot(encoded: string): ListShareSnapshot | null {
  try {
    const raw = LZString.decompressFromEncodedURIComponent(encoded);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const rec = parsed as Record<string, unknown>;
    if (rec.type !== "wishlist" && rec.type !== "shopping") return null;
    if (typeof rec.name !== "string") return null;
    const entriesRaw = Array.isArray(rec.entries) ? rec.entries : [];
    const entries: ListShareSnapshot["entries"] = [];
    for (const row of entriesRaw) {
      if (!row || typeof row !== "object") continue;
      const e = row as Record<string, unknown>;
      const qty = typeof e.qty === "number" && Number.isFinite(e.qty) && e.qty > 0 ? e.qty : 1;
      const itemKey = typeof e.itemKey === "string" && e.itemKey ? e.itemKey : undefined;
      const note = typeof e.note === "string" && e.note ? e.note : undefined;
      if (!itemKey && !note) continue;
      const entry: ListShareSnapshot["entries"][number] = { qty };
      if (itemKey) entry.itemKey = itemKey;
      if (typeof e.level === "number" && Number.isFinite(e.level)) entry.level = e.level;
      if (typeof e.p === "string" && e.p) entry.p = e.p;
      if (typeof e.stat_type === "string" && e.stat_type) entry.stat_type = e.stat_type;
      if (note) entry.note = note;
      entries.push(entry);
    }
    return {
      type: rec.type,
      name: rec.name.trim() || (rec.type === "wishlist" ? "Wishlist" : "Shopping"),
      entries,
    };
  } catch {
    return null;
  }
}

export function listsShareUrl(snapshot: ListShareSnapshot): string {
  const encoded = encodeListShareSnapshot(snapshot);
  return `${window.location.origin}/lists?list=${encoded}`;
}
