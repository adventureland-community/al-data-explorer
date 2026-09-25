import {
  BANK_ALIASES,
  BANK_OPS,
  emptyQuerySearchMenu,
  freeTokenNeedle,
  ITEM_SEARCH_FLAG_SUGGESTIONS,
  pushAttrKeySuggestions,
  pushFlagValueSuggestions,
  pushOperatorSuggestions,
  pushQuerySearchSection,
  trailingFieldContext,
  trailingOpsFor,
  type QuerySearchMenu,
} from "../../Shared/querySearch";

const BANK_ATTR_SUGGEST_KEYS = [
  "str",
  "int",
  "dex",
  "vit",
  "armor",
  "resistance",
  "attack",
  "crit",
  "luck",
  "hp",
  "mp",
] as const;

/** Bank-only suggestion menu for QuerySearchBar. */
export function buildBankSearchSuggestions(
  raw: string,
  opts: {
    types: string[];
    categories: string[];
    itemNames?: string[];
  },
): QuerySearchMenu {
  const menu = emptyQuerySearchMenu();
  const trailing = trailingFieldContext(raw, trailingOpsFor("bank"), BANK_ALIASES);
  const needle = (trailing?.value || "").toLowerCase();

  if (trailing?.op === "is") {
    pushFlagValueSuggestions(menu, ITEM_SEARCH_FLAG_SUGGESTIONS, needle);
    return menu;
  }

  if (trailing?.op === "attr") {
    pushAttrKeySuggestions(menu, BANK_ATTR_SUGGEST_KEYS, needle);
    return menu;
  }

  if (trailing?.op === "type" && opts.types.length) {
    const rows = [];
    for (const t of opts.types) {
      if (needle && !t.toLowerCase().startsWith(needle)) continue;
      if (rows.length >= 20) break;
      rows.push({
        kind: "value" as const,
        label: t,
        hint: "type",
        value: t,
      });
    }
    pushQuerySearchSection(menu, "Types", rows);
    return menu;
  }

  if (trailing?.op === "category" && opts.categories.length) {
    const rows = [];
    for (const c of opts.categories) {
      if (needle && !c.toLowerCase().includes(needle)) continue;
      if (rows.length >= 20) break;
      rows.push({
        kind: "value" as const,
        label: c,
        hint: "category",
        value: c.includes(" ") ? `"${c}"` : c,
      });
    }
    pushQuerySearchSection(menu, "Categories", rows);
    return menu;
  }

  if (trailing) return menu;

  const freeNeedle = freeTokenNeedle(raw);
  pushOperatorSuggestions(menu, BANK_OPS, freeNeedle);

  if (opts.itemNames?.length && freeNeedle.length >= 2) {
    const rows = [];
    for (const n of opts.itemNames) {
      if (!n.toLowerCase().includes(freeNeedle)) continue;
      if (rows.length >= 12) break;
      rows.push({
        kind: "op" as const,
        label: n,
        hint: "item",
        insert: `${n} `,
      });
    }
    pushQuerySearchSection(menu, "Items", rows);
  }

  return menu;
}
