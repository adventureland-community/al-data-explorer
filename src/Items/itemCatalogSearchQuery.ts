/**
 * Item catalog search — Items browse + ItemPicker (catalog/gear/luck profiles).
 * No market price/merchant or monster hp/respawn ops.
 */

import type { GData, GItem, ItemKey, StatType } from "typed-adventureland";

import { itemMatchesClasses } from "../gameData/itemMeta";
import { itemMatchesSearch } from "../gameData/itemFilters";
import { getMaxLevel } from "../gameData/itemProperties";
import {
  buildItemStatsForSearch,
  CATALOG_OPS,
  compareNumber,
  emptyQuerySearchMenu,
  freeTokenNeedle,
  GEAR_OPS,
  ITEM_FLAG_ALIASES,
  itemHasSearchFlag,
  ITEM_SEARCH_FLAG_SUGGESTIONS,
  LUCK_OPS,
  parseAmount,
  parseAttrSpecs,
  parseCompareOpToken,
  parseOrGroups,
  pushAttrKeySuggestions,
  pushFlagValueSuggestions,
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
  type ItemSearchFlag,
  type NumericCompareOp,
  type QuerySearchMenu,
  type SearchContextId,
  type SurfaceOpDef,
} from "../Shared/querySearch";

export type ItemCatalogFlag = ItemSearchFlag;

export type ItemCatalogClause =
  | { kind: "text"; value: string; negated?: boolean }
  | { kind: "name"; value: string; negated?: boolean }
  | { kind: "type"; value: string; negated?: boolean }
  | { kind: "wtype"; value: string; negated?: boolean }
  | { kind: "tier"; op: NumericCompareOp; value: number; negated?: boolean }
  | { kind: "class"; value: string; negated?: boolean }
  | { kind: "set"; value: string; negated?: boolean }
  | { kind: "title"; value: string; negated?: boolean }
  | { kind: "is"; value: ItemCatalogFlag; negated?: boolean }
  | { kind: "level"; op: NumericCompareOp; value: number; negated?: boolean }
  | { kind: "attr"; specs: AttrSpec[]; negated?: boolean };

type ItemCatalogRestClause = Exclude<ItemCatalogClause, { kind: "level" } | { kind: "attr" }>;

export type ItemCatalogQuery = { groups: ItemCatalogClause[][] };

export type ItemCatalogMatchOpts = {
  /**
   * Fixed level for attr / level projection (gear picker slider).
   * When omitted (Items browse), `attr:` matches if **any** valid upgrade level
   * satisfies the specs; `level:` narrows which levels are considered (or, alone,
   * whether the item can reach that level).
   */
  level?: number;
  p?: string;
  statType?: StatType | string;
  /** When true, bare text also matches attribute names (legacy picker). */
  matchAttributeNames?: boolean;
};

const FIELD_OPS = new Set([
  "type",
  "wtype",
  "tier",
  "class",
  "set",
  "title",
  "name",
  "is",
  "attr",
  "level",
]);

function parseClause(token: string): ItemCatalogClause | null {
  const { negated, body: rawBody } = splitTokenNegation(token);
  const body = rawBody;
  const withNeg = <T extends ItemCatalogClause>(c: T): T => withClauseNegation(c, negated);

  if (body.startsWith('"') && body.endsWith('"')) {
    const value = stripQueryQuotes(body).trim();
    if (!value) return null;
    return withNeg({ kind: "text", value });
  }

  const numeric = /^(tier|level)(>=|<=|>|<|:|=)(-?\d+(?:\.\d+)?)$/iu.exec(body);
  if (numeric) {
    const kind = numeric[1].toLowerCase() as "tier" | "level";
    const op = parseCompareOpToken(numeric[2]);
    const value = Number(numeric[3]);
    if (!Number.isFinite(value)) return null;
    return withNeg({ kind, op, value });
  }

  const colon = /^([a-z]+):(.*)$/iu.exec(body);
  if (colon) {
    const field = colon[1].toLowerCase();
    const value = colon[2].trim().replace(/^"|"$/gu, "");
    if (!FIELD_OPS.has(field)) {
      // Foreign ops (price, hp, …) ignored as text so they don't silently match
      return withNeg({ kind: "text", value: body });
    }
    if (!value && field !== "attr") return null;

    if (field === "is") {
      const flag = ITEM_FLAG_ALIASES[value.toLowerCase()];
      if (!flag) return withNeg({ kind: "text", value: body });
      return withNeg({ kind: "is", value: flag });
    }
    if (field === "attr") {
      const specs = parseAttrSpecs(value);
      if (!specs.length) return null;
      return withNeg({ kind: "attr", specs });
    }
    if (field === "tier" || field === "level") {
      const amt = parseAmount(value);
      if (!amt) return null;
      return withNeg({ kind: field, op: amt.op, value: amt.n });
    }
    if (
      field === "type" ||
      field === "wtype" ||
      field === "class" ||
      field === "set" ||
      field === "title" ||
      field === "name"
    ) {
      return withNeg({ kind: field, value });
    }
  }

  return withNeg({ kind: "text", value: body });
}

export function parseItemCatalogQuery(input: string): ItemCatalogQuery {
  return {
    groups: parseOrGroups(input, parseClause),
  };
}

function itemMaxSearchLevel(gItem: GItem): number {
  return getMaxLevel(gItem) ?? 0;
}

function attrMatchesAtLevel(
  gItem: GItem,
  G: GData | undefined,
  specs: AttrSpec[],
  level: number,
  opts: ItemCatalogMatchOpts,
): boolean {
  const stats = buildItemStatsForSearch({
    def: gItem,
    level,
    p: opts.p,
    statType: opts.statType,
    G,
  });
  return statsMatchAttrSpecs(stats, specs);
}

/** Levels 0…max that satisfy all positive `level:` clauses (and none of the negated). */
function candidateLevels(
  gItem: GItem,
  levelClauses: Extract<ItemCatalogClause, { kind: "level" }>[],
): number[] {
  const max = itemMaxSearchLevel(gItem);
  const levels: number[] = [];
  for (let level = 0; level <= max; level += 1) {
    let ok = true;
    for (const clause of levelClauses) {
      const hit = compareNumber(level, clause.op, clause.value);
      if (clause.negated ? hit : !hit) {
        ok = false;
        break;
      }
    }
    if (ok) levels.push(level);
  }
  return levels;
}

function resolveLevels(
  gItem: GItem,
  opts: ItemCatalogMatchOpts,
  levelClauses: Extract<ItemCatalogClause, { kind: "level" }>[],
): number[] {
  if (opts.level != null) {
    const { level } = opts;
    for (const clause of levelClauses) {
      const hit = compareNumber(level, clause.op, clause.value);
      if (clause.negated ? hit : !hit) return [];
    }
    return [level];
  }
  return candidateLevels(gItem, levelClauses);
}

function clauseMatches(
  itemKey: ItemKey,
  gItem: GItem,
  G: GData | undefined,
  clause: ItemCatalogRestClause,
  opts: ItemCatalogMatchOpts,
): boolean {
  let hit = false;
  switch (clause.kind) {
    case "text":
      hit = itemMatchesSearch(itemKey, gItem, clause.value, {
        matchAttributes: opts.matchAttributeNames,
        sets: G?.sets as Record<string, Record<string, unknown>> | undefined,
      });
      break;
    case "name":
      hit =
        itemKey.toLowerCase().includes(clause.value.toLowerCase()) ||
        gItem.name.toLowerCase().includes(clause.value.toLowerCase());
      break;
    case "type":
      hit = Boolean(gItem.type && gItem.type.toLowerCase() === clause.value.toLowerCase());
      break;
    case "wtype":
      hit = Boolean(gItem.wtype && gItem.wtype.toLowerCase() === clause.value.toLowerCase());
      break;
    case "tier":
      hit = compareNumber(gItem.tier ?? 0, clause.op, clause.value);
      break;
    case "class":
      hit = itemMatchesClasses(gItem, [clause.value.toLowerCase()]);
      break;
    case "set": {
      const setKey = (gItem as { set?: string }).set;
      hit = Boolean(setKey && setKey.toLowerCase() === clause.value.toLowerCase());
      break;
    }
    case "title":
      // Catalog defs don't carry instance titles — match title key substring on name for browse
      hit = gItem.name.toLowerCase().includes(clause.value.toLowerCase());
      break;
    case "is":
      hit = itemHasSearchFlag(gItem, itemKey, clause.value, G);
      break;
    default: {
      const _exhaustive: never = clause;
      return _exhaustive;
    }
  }
  return clause.negated ? !hit : hit;
}

const OR_FIELD_KINDS = new Set(["type", "wtype", "class", "set", "title"]);

function groupMatches(
  itemKey: ItemKey,
  gItem: GItem,
  G: GData | undefined,
  group: ItemCatalogClause[],
  opts: ItemCatalogMatchOpts,
): boolean {
  const orBuckets = new Map<string, ItemCatalogClause[]>();
  const other: ItemCatalogClause[] = [];
  for (const clause of group) {
    if (!clause.negated && OR_FIELD_KINDS.has(clause.kind)) {
      const bucket = orBuckets.get(clause.kind) ?? [];
      bucket.push(clause);
      orBuckets.set(clause.kind, bucket);
      continue;
    }
    other.push(clause);
  }

  for (const clauses of orBuckets.values()) {
    let any = false;
    for (const clause of clauses) {
      if (clauseMatches(itemKey, gItem, G, clause as ItemCatalogRestClause, opts)) {
        any = true;
        break;
      }
    }
    if (!any) return false;
  }

  const levelClauses = other.filter(
    (c): c is Extract<ItemCatalogClause, { kind: "level" }> => c.kind === "level",
  );
  const attrClauses = other.filter(
    (c): c is Extract<ItemCatalogClause, { kind: "attr" }> => c.kind === "attr",
  );
  const rest = other.filter(
    (c): c is ItemCatalogRestClause => c.kind !== "level" && c.kind !== "attr",
  );

  for (const clause of rest) {
    if (!clauseMatches(itemKey, gItem, G, clause, opts)) return false;
  }

  if (!levelClauses.length && !attrClauses.length) return true;

  const levels = resolveLevels(gItem, opts, levelClauses);
  if (!levels.length) return false;

  if (!attrClauses.length) return true;

  for (const level of levels) {
    let attrsOk = true;
    for (const clause of attrClauses) {
      const hit = attrMatchesAtLevel(gItem, G, clause.specs, level, opts);
      if (clause.negated ? hit : !hit) {
        attrsOk = false;
        break;
      }
    }
    if (attrsOk) return true;
  }
  return false;
}

export function itemCatalogMatchesQuery(
  itemKey: ItemKey,
  gItem: GItem,
  G: GData | undefined,
  query: ItemCatalogQuery,
  opts: ItemCatalogMatchOpts = {},
): boolean {
  return queryMatchesAnyGroup(query.groups, { itemKey, gItem, G, opts }, (ctx, group) =>
    groupMatches(ctx.itemKey, ctx.gItem, ctx.G, group, ctx.opts),
  );
}

export function itemCatalogMatchesSearch(
  itemKey: ItemKey,
  gItem: GItem,
  G: GData | undefined,
  search: string,
  opts: ItemCatalogMatchOpts = {},
): boolean {
  const trimmed = search.trim();
  if (!trimmed) return true;
  return itemCatalogMatchesQuery(itemKey, gItem, G, parseItemCatalogQuery(trimmed), opts);
}

/** True when search uses catalog field syntax (vs plain substring). */
export function itemCatalogSearchHasSyntax(search: string): boolean {
  return /(?:^|\s)-?(?:type|wtype|tier|class|set|title|name|is|attr|level)\s*(?:>=|<=|>|<|:|=)/iu.test(
    search,
  );
}

function opsForContext(
  context: Extract<SearchContextId, "catalog" | "gear" | "luck">,
): readonly SurfaceOpDef[] {
  if (context === "luck") return LUCK_OPS;
  if (context === "gear") return GEAR_OPS;
  return CATALOG_OPS;
}

function attrKeysForContext(
  context: Extract<SearchContextId, "catalog" | "gear" | "luck">,
): readonly string[] {
  if (context === "luck") return ["luck", "gold", "xp", "str", "int", "dex", "vit"];
  if (context === "gear") {
    return ["attack", "armor", "resistance", "str", "int", "dex", "crit", "frequency", "range"];
  }
  return ["str", "int", "dex", "vit", "armor", "resistance", "attack", "crit", "luck", "hp", "mp"];
}

export function buildItemCatalogSuggestions(
  raw: string,
  context: Extract<SearchContextId, "catalog" | "gear" | "luck">,
  opts: { types?: string[]; wtypes?: string[] } = {},
): QuerySearchMenu {
  const menu = emptyQuerySearchMenu();
  const trailing = trailingFieldContext(raw, trailingOpsFor(context));
  const needle = (trailing?.value || "").toLowerCase();

  if (trailing?.op === "is") {
    pushFlagValueSuggestions(menu, ITEM_SEARCH_FLAG_SUGGESTIONS, needle);
    return menu;
  }

  if (trailing?.op === "attr") {
    pushAttrKeySuggestions(menu, attrKeysForContext(context), needle);
    return menu;
  }

  if (trailing?.op === "type" && opts.types?.length) {
    const rows = [];
    for (const t of opts.types) {
      if (needle && !t.toLowerCase().startsWith(needle)) continue;
      if (rows.length >= 24) break;
      rows.push({ kind: "value" as const, label: t, hint: "type", value: t });
    }
    pushQuerySearchSection(menu, "Types", rows);
    return menu;
  }

  if (trailing?.op === "wtype" && opts.wtypes?.length) {
    const rows = [];
    for (const t of opts.wtypes) {
      if (needle && !t.toLowerCase().startsWith(needle)) continue;
      if (rows.length >= 24) break;
      rows.push({ kind: "value" as const, label: t, hint: "wtype", value: t });
    }
    pushQuerySearchSection(menu, "Weapon types", rows);
    return menu;
  }

  if (trailing) return menu;

  pushOperatorSuggestions(menu, opsForContext(context), freeTokenNeedle(raw));
  return menu;
}
