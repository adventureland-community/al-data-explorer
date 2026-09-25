/**
 * Market search — market-only ops (price, merchant, buy/sell). No bank/monster fields.
 */

import type { GData, ItemKey, TitleKey } from "typed-adventureland";

import { getItemName, getTitleName } from "../Shared/iteminfo-util";
import {
  ITEM_ATTR_KEYS,
  MARKET_ALIASES,
  MARKET_OPS,
  anyAmountMatches,
  buildItemStatsForSearch,
  emptyQuerySearchMenu,
  freeTokenNeedle,
  getSurfaceMeta,
  groupAndMatch,
  parseAmount,
  parseAmountList,
  parseAttrSpecs,
  parseOrGroups,
  pushAttrKeySuggestions,
  pushOperatorSuggestions,
  pushQuerySearchSection,
  queryMatchesAnyGroup,
  splitTokenNegation,
  statsMatchAttrSpecs,
  stripQueryQuotes,
  trailingFieldContext,
  trailingOpsFor,
  withClauseNegation,
  type AttrSpec,
  type ParsedAmount,
  type QuerySearchMenu,
} from "../Shared/querySearch";
import type { BuySellItemPrices } from "./merchantTypes";

export type MarketSearchRow = {
  itemName: ItemKey;
  title: TitleKey | "";
  level: number;
  prices: BuySellItemPrices;
};

export type MarketClause =
  | { kind: "text"; value: string; negated?: boolean }
  | { kind: "item"; value: string; negated?: boolean }
  | { kind: "title"; value: string; negated?: boolean }
  | { kind: "merchant"; value: string; negated?: boolean }
  | { kind: "level"; amts: ParsedAmount[]; negated?: boolean }
  | { kind: "price"; amts: ParsedAmount[]; side?: "buy" | "sell" | "any"; negated?: boolean }
  | { kind: "attr"; specs: AttrSpec[]; negated?: boolean }
  | { kind: "is"; value: "buy" | "sell"; negated?: boolean }
  | { kind: "has"; value: "title"; negated?: boolean };

export type MarketSearchQuery = { groups: MarketClause[][] };

type MarketMatchCtx = { row: MarketSearchRow; G: GData | undefined };

const MARKET_FIELD_NAMES = new Set([
  ...MARKET_OPS.map((op) => op.name),
  ...Object.keys(MARKET_ALIASES),
]);

function parseClause(token: string): MarketClause | null {
  const { negated, body } = splitTokenNegation(token);
  const withNeg = <T extends MarketClause>(clause: T): T => withClauseNegation(clause, negated);

  if (body.startsWith('"') && body.endsWith('"')) {
    const value = stripQueryQuotes(body).trim();
    if (!value) return null;
    return withNeg({ kind: "text", value });
  }

  const m = /^([a-z]+):(.*)$/iu.exec(body);
  if (!m) return withNeg({ kind: "text", value: body });

  const field = m[1].toLowerCase();
  if (!MARKET_FIELD_NAMES.has(field)) {
    return withNeg({ kind: "text", value: body });
  }
  const raw = stripQueryQuotes(m[2].trim());
  if (!raw && field !== "has" && field !== "is") return null;

  if (field === "mer" || field === "merchant") {
    return withNeg({ kind: "merchant", value: raw });
  }
  if (field === "item") return withNeg({ kind: "item", value: raw });
  if (field === "title") return withNeg({ kind: "title", value: raw });
  if (field === "attr") {
    const specs = parseAttrSpecs(raw);
    if (!specs.length) return null;
    return withNeg({ kind: "attr", specs });
  }
  if (field === "level") {
    const amts = parseAmountList(raw);
    if (!amts.length) return null;
    return withNeg({ kind: "level", amts });
  }
  if (field === "price") {
    let side: "buy" | "sell" | "any" = "any";
    let rest = raw;
    const sideMatch = /^(buy|sell)\s*[:|]?\s*(.*)$/iu.exec(raw);
    if (sideMatch) {
      side = sideMatch[1].toLowerCase() as "buy" | "sell";
      rest = sideMatch[2] || "";
    }
    let amts = parseAmountList(rest || raw);
    if (!amts.length && !sideMatch) {
      const amt = parseAmount(raw);
      if (amt) amts = [amt];
    }
    if (!amts.length) return null;
    return withNeg({ kind: "price", amts, side });
  }
  if (field === "is") {
    const v = raw.toLowerCase();
    if (v === "buy" || v === "buying" || v === "want") {
      return withNeg({ kind: "is", value: "buy" });
    }
    if (v === "sell" || v === "selling" || v === "sale") {
      return withNeg({ kind: "is", value: "sell" });
    }
    return withNeg({ kind: "text", value: body });
  }
  if (field === "has") {
    if (raw.toLowerCase() === "title" || raw.toLowerCase() === "p") {
      return withNeg({ kind: "has", value: "title" });
    }
    return withNeg({ kind: "text", value: body });
  }
  return withNeg({ kind: "text", value: body });
}

export function parseMarketSearchQuery(input: string): MarketSearchQuery {
  return { groups: parseOrGroups(input, parseClause) };
}

function clauseMatches(ctx: MarketMatchCtx, clause: MarketClause): boolean {
  const { row, G } = ctx;
  const gItem = G?.items[row.itemName];
  let hit = false;

  switch (clause.kind) {
    case "text": {
      const needle = clause.value.toLowerCase();
      const display = gItem ? getItemName(row.itemName, gItem).toLowerCase() : "";
      hit =
        row.itemName.toLowerCase().includes(needle) ||
        display.includes(needle) ||
        String(row.title).toLowerCase().includes(needle);
      break;
    }
    case "item": {
      const needle = clause.value.toLowerCase();
      const display = gItem ? getItemName(row.itemName, gItem).toLowerCase() : "";
      hit = row.itemName.toLowerCase().includes(needle) || display.includes(needle);
      break;
    }
    case "title": {
      const needle = clause.value.toLowerCase();
      const titleDisp = row.title && G ? getTitleName({ p: row.title }, G).toLowerCase() : "";
      hit = String(row.title).toLowerCase().includes(needle) || titleDisp.includes(needle);
      break;
    }
    case "merchant": {
      const needle = clause.value.toLowerCase();
      const buyers = Object.keys(row.prices.buying.merchants);
      const sellers = Object.keys(row.prices.selling.merchants);
      hit = [...buyers, ...sellers].some((id) => id.toLowerCase().includes(needle));
      break;
    }
    case "level":
      hit = anyAmountMatches(row.level, clause.amts);
      break;
    case "price": {
      const sellMin = row.prices.selling.minPrice.price || 0;
      const buyMax = row.prices.buying.maxPrice.price || 0;
      const side = clause.side ?? "any";
      if (side === "sell") hit = anyAmountMatches(sellMin, clause.amts);
      else if (side === "buy") hit = anyAmountMatches(buyMax, clause.amts);
      else hit = anyAmountMatches(sellMin, clause.amts) || anyAmountMatches(buyMax, clause.amts);
      break;
    }
    case "attr": {
      if (!gItem) {
        hit = false;
        break;
      }
      const stats = buildItemStatsForSearch({
        def: gItem,
        level: row.level,
        p: row.title ? String(row.title) : undefined,
        G,
      });
      hit = statsMatchAttrSpecs(stats, clause.specs);
      break;
    }
    case "is":
      if (clause.value === "buy") hit = Object.keys(row.prices.buying.merchants).length > 0;
      else hit = Object.keys(row.prices.selling.merchants).length > 0;
      break;
    case "has":
      hit = Boolean(row.title);
      break;
    default: {
      const _exhaustive: never = clause;
      return _exhaustive;
    }
  }

  return clause.negated ? !hit : hit;
}

export function marketRowMatchesQuery(
  row: MarketSearchRow,
  G: GData | undefined,
  query: MarketSearchQuery,
): boolean {
  return queryMatchesAnyGroup(query.groups, { row, G }, (entity, group) =>
    groupAndMatch(entity, group, clauseMatches),
  );
}

export function marketRowMatchesSearch(
  row: MarketSearchRow,
  G: GData | undefined,
  search: string,
): boolean {
  const trimmed = search.trim();
  if (!trimmed) return true;
  return marketRowMatchesQuery(row, G, parseMarketSearchQuery(trimmed));
}

export function buildMarketSearchSuggestions(
  raw: string,
  opts: { itemKeys?: string[]; merchants?: string[] },
): QuerySearchMenu {
  const menu = emptyQuerySearchMenu();
  const trailing = trailingFieldContext(
    raw,
    trailingOpsFor("market"),
    getSurfaceMeta("market").aliases,
  );
  const needle = (trailing?.value || "").toLowerCase();

  if (trailing?.op === "is") {
    pushQuerySearchSection(
      menu,
      "Side",
      (
        [
          { kind: "value" as const, label: "sell", hint: "Has sellers", value: "sell" },
          { kind: "value" as const, label: "buy", hint: "Has buyers", value: "buy" },
        ] as const
      ).filter((r) => !needle || r.label.startsWith(needle)),
    );
    return menu;
  }

  if (trailing?.op === "has") {
    pushQuerySearchSection(menu, "Has", [
      { kind: "value", label: "title", hint: "Titled listing", value: "title" },
    ]);
    return menu;
  }

  if (trailing?.op === "attr") {
    pushAttrKeySuggestions(menu, ITEM_ATTR_KEYS, needle);
    return menu;
  }

  if (trailing?.op === "merchant" && opts.merchants?.length) {
    pushQuerySearchSection(
      menu,
      "Merchants",
      opts.merchants
        .filter((m) => !needle || m.toLowerCase().includes(needle))
        .slice(0, 20)
        .map((m) => ({
          kind: "value" as const,
          label: m,
          hint: "merchant",
          value: m,
        })),
    );
    return menu;
  }

  if (trailing?.op === "item" && opts.itemKeys?.length) {
    pushQuerySearchSection(
      menu,
      "Items",
      opts.itemKeys
        .filter((k) => !needle || k.toLowerCase().includes(needle))
        .slice(0, 16)
        .map((k) => ({
          kind: "value" as const,
          label: k,
          hint: "item",
          value: k,
        })),
    );
    return menu;
  }

  if (trailing) return menu;

  pushOperatorSuggestions(menu, MARKET_OPS, freeTokenNeedle(raw));
  return menu;
}
