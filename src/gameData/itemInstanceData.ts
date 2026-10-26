import type { ItemInfo, ItemKey } from "typed-adventureland";

/**
 * Free-form `ItemInfo.data` — not yet on typed-adventureland's ItemInfo.
 * For `cxjar`, the server stores the cosmetic id here (drop 4th field / token `cxjar-…`).
 * Mechanics from adventureland_mongodb; explorer UI must also work against official
 * `public/data.json` (local mongo may have unpublished tokens/crafts).
 * @see adventureland_mongodb node/server.js drop_item_logic + exchange_buy
 */
export type ItemInfoData = string;

export type ItemInfoWithData = ItemInfo & { data?: ItemInfoData };

const CXJAR_NAME = "cxjar";

/** Read `data` from an inventory/bank/trade instance. */
export function getItemData(item: object | null | undefined): ItemInfoData | undefined {
  if (!item || !("data" in item)) return undefined;
  const raw = (item as { data?: unknown }).data;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed || undefined;
}

export function isCxJarName(name: string | undefined | null): boolean {
  return name === CXJAR_NAME;
}

/** Cosmetic id sealed in a CX Jar (`ItemInfo.data`). */
export function cxJarData(
  item: { name?: string; data?: unknown } | null | undefined,
): string | undefined {
  if (!item || !isCxJarName(item.name)) return undefined;
  return getItemData(item);
}

/**
 * Token shop keys may be `name-data` (server: `name.search("-")` → split).
 * Prefer the longest known item prefix so `cxjar-xgravestone2` → cxjar + xgravestone2.
 */
export function parseCompoundItemKey(
  offerKey: string,
  knownItems?: Record<string, unknown>,
): { name: string; data?: string; offerKey: string } {
  const dash = offerKey.indexOf("-");
  if (dash <= 0) return { name: offerKey, offerKey };

  if (knownItems) {
    for (let i = offerKey.length - 1; i > 0; i -= 1) {
      if (offerKey[i] !== "-") continue;
      const name = offerKey.slice(0, i);
      const data = offerKey.slice(i + 1);
      if (data && knownItems[name] != null) {
        return { name, data, offerKey };
      }
    }
  }

  // Server fallback: first hyphen only.
  const name = offerKey.slice(0, dash);
  const data = offerKey.slice(dash + 1);
  if (!data) return { name: offerKey, offerKey };
  return { name, data, offerKey };
}

/** Craft recipe `output` override (`G.craft.makeawishjar.output`). */
export type CraftOutputOverride = { name: string; data?: string; q?: number };

export function parseCraftOutput(
  craft: { output?: unknown } | null | undefined,
  fallbackName: string,
): CraftOutputOverride {
  const raw = craft?.output;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    if (typeof rec.name === "string" && rec.name) {
      const data = typeof rec.data === "string" && rec.data ? rec.data : undefined;
      const q = typeof rec.q === "number" && Number.isFinite(rec.q) ? rec.q : undefined;
      return {
        name: rec.name,
        ...(data ? { data } : {}),
        ...(q != null ? { q } : {}),
      };
    }
  }
  return { name: fallbackName };
}

/**
 * Build an ItemInfo for UI from a drop row.
 * `DropSource.title` is cosmetic id for cxjar / cx / cxbundle; item title (`p`) otherwise.
 * Drop tables may still say `cx`; normalize to `cxjar` + `data` like the live server.
 */
export function itemInfoFromDropFields(args: {
  itemKey: string;
  quantity?: number | null;
  title?: string;
}): ItemInfoWithData {
  const title = args.title?.trim() || "";
  const q =
    args.quantity != null && Number.isFinite(args.quantity) && args.quantity > 0
      ? args.quantity
      : undefined;
  const name = (args.itemKey === "cx" ? CXJAR_NAME : args.itemKey) as ItemKey;
  const base = {
    name,
    ...(q != null ? { q } : {}),
  };

  if (isCxJarName(name)) {
    return { ...base, ...(title ? { data: title } : {}) };
  }

  if (title) {
    return { ...base, p: title as ItemInfo["p"] };
  }
  return base;
}

/** Short caption for tooltips / bank labels (cosmetic id or Empty). */
export function formatItemDataCaption(item: { name?: string; data?: unknown }): string | undefined {
  if (!isCxJarName(item.name)) {
    const data = getItemData(item);
    return data;
  }
  const data = getItemData(item);
  if (!data) return "Empty / Anomaly";
  return data;
}

/** Append ` · data` when present (names stay "CX Jar"; payload is secondary). */
export function appendDataBadge(badges: string[], item: { name?: string; data?: unknown }): void {
  const caption = formatItemDataCaption(item);
  if (caption) badges.push(caption);
}

/**
 * Market / bank grouping key for instance variants.
 * Mirrors `can_stack`: same name stacks only when `p` and (for cxjar) `data` match.
 */
export function instanceVariantKey(item: { p?: string; data?: unknown }): string {
  const title = typeof item.p === "string" ? item.p : "";
  return `${title}\0${getItemData(item) ?? ""}`;
}

export function parseInstanceVariantKey(key: string): { title: string; data?: string } {
  const sep = key.indexOf("\0");
  if (sep < 0) return { title: key };
  const title = key.slice(0, sep);
  const data = key.slice(sep + 1);
  return data ? { title, data } : { title };
}
