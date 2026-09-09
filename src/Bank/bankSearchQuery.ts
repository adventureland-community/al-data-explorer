import type { GCraft, GData, GItem, ItemInfoPValues } from "typed-adventureland";
import { ItemKey } from "typed-adventureland";
import { CustomGData } from "../GDataContext";
import { itemMatchesClasses } from "../gameData/itemMeta";
import { getItemGrade } from "../gameData/playerItemDisplay";
import { itemMatchesSearch } from "../gameData/itemFilters";
import { getTitleName } from "../Shared/iteminfo-util";
import { getBankItemCategory } from "./bankCategory";

/** Minimal item shape for search matching (aggregated or pack slot). */
export type BankSearchableItem = {
  p?: ItemInfoPValues;
  level: number;
  name: string;
  q: number;
  stack: number;
  category: string;
};

export type BankSearchFlag =
  | "exchange"
  | "upgrade"
  | "compound"
  | "craft"
  | "craftable"
  | "event"
  | "legacy";

export type NumericCompareOp = "=" | ">" | ">=" | "<" | "<=";

export type BankSearchClause =
  | { kind: "text"; value: string; negated?: boolean }
  | { kind: "type"; value: string; negated?: boolean }
  | { kind: "title"; value: string; negated?: boolean }
  | { kind: "class"; value: string; negated?: boolean }
  | { kind: "set"; value: string; negated?: boolean }
  | { kind: "category"; value: string; negated?: boolean }
  | { kind: "name"; value: string; negated?: boolean }
  | { kind: "is"; value: BankSearchFlag; negated?: boolean }
  | { kind: "q"; op: NumericCompareOp; value: number; negated?: boolean }
  | { kind: "stack"; op: NumericCompareOp; value: number; negated?: boolean }
  | { kind: "level"; op: NumericCompareOp; value: number; negated?: boolean }
  | { kind: "grade"; op: NumericCompareOp; value: number; negated?: boolean };

/** OR of groups; each group is AND of clauses. Bare text terms AND together (Gmail-style). */
export type BankSearchQuery = {
  groups: BankSearchClause[][];
};

export type BankAdvancedSearchForm = {
  /** Space-separated; serialized with OR (match any item term). */
  anyWords: string;
  /** Space-separated; serialized as AND terms (item must match every word). */
  allWords: string;
  /** Space-separated exclusions (`-term`). */
  exclude: string;
  types: string[];
  titles: string[];
  classKeys: string[];
  setKeys: string[];
  categories: string[];
  minQ: string;
  minLevel: string;
  minGrade: string;
  flags: Partial<Record<BankSearchFlag, boolean>>;
};

export const EMPTY_BANK_ADVANCED_SEARCH: BankAdvancedSearchForm = {
  anyWords: "",
  allWords: "",
  exclude: "",
  types: [],
  titles: [],
  classKeys: [],
  setKeys: [],
  categories: [],
  minQ: "",
  minLevel: "",
  minGrade: "",
  flags: {},
};

export const BANK_SEARCH_SYNTAX_HELP: { op: string; meaning: string; example: string }[] = [
  { op: "word / word", meaning: "Item must match every word (AND)", example: "fire blade" },
  { op: "OR  or  ,", meaning: "Match either side (multi-item)", example: "hpot OR mpot" },
  { op: '"phrase"', meaning: "Exact phrase", example: '"fire staff"' },
  { op: "-word", meaning: "Exclude matches", example: "scroll -cscroll" },
  {
    op: "type:",
    meaning: "Item type (repeat / multi-select = OR)",
    example: "type:weapon type:shield",
  },
  { op: "title:", meaning: "Title / prefix (multi = OR)", example: "title:lucky" },
  { op: "class:", meaning: "Class restriction (multi = OR)", example: "class:warrior" },
  { op: "set:", meaning: "Set key (multi = OR)", example: "set:mwarrior" },
  { op: "category:", meaning: "Bank category (multi = OR)", example: "category:Potions" },
  { op: "name:", meaning: "Name or key only", example: "name:hpot" },
  { op: "is:", meaning: "Flag", example: "is:upgrade" },
  { op: "q> q>= q: ", meaning: "Quantity", example: "q>=50" },
  { op: "stack>", meaning: "Occupied stacks", example: "stack>1" },
  { op: "level:", meaning: "Item level", example: "level:9" },
  { op: "grade:", meaning: "Min / compared grade", example: "grade>=2" },
];

const FIELD_OPS = new Set(["type", "title", "class", "set", "category", "cat", "name", "is"]);

const FLAG_ALIASES: Record<string, BankSearchFlag> = {
  exchange: "exchange",
  upgrade: "upgrade",
  compound: "compound",
  craft: "craft",
  craftable: "craftable",
  event: "event",
  legacy: "legacy",
};

function compareNumber(actual: number, op: NumericCompareOp, expected: number): boolean {
  switch (op) {
    case "=":
      return actual === expected;
    case ">":
      return actual > expected;
    case ">=":
      return actual >= expected;
    case "<":
      return actual < expected;
    case "<=":
      return actual <= expected;
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
}

function quoteIfNeeded(value: string): string {
  if (!value) return '""';
  if (/[\s"]/u.test(value)) return `"${value.replace(/"/gu, "")}"`;
  return value;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  const re = /"([^"]*)"|(\S+)/gu;
  let match: RegExpExecArray | null = re.exec(input);
  while (match) {
    if (match[1] !== undefined) {
      tokens.push(`"${match[1]}"`);
    } else if (match[2]) {
      tokens.push(match[2]);
    }
    match = re.exec(input);
  }
  return tokens;
}

function hasFieldOrNumericSyntax(input: string): boolean {
  return (
    /(?:^|\s)-?(?:type|title|class|set|category|cat|name|is):/iu.test(input) ||
    /(?:^|\s)-?(?:q|stack|level|grade)\s*(?:>=|<=|>|<|:|=)/iu.test(input)
  );
}

function parseNumericOp(raw: string): NumericCompareOp {
  if (raw === ">=") return ">=";
  if (raw === "<=") return "<=";
  if (raw === ">") return ">";
  if (raw === "<") return "<";
  return "=";
}

function parseClause(token: string): BankSearchClause | null {
  let negated = false;
  let body = token;
  if (body.startsWith("-") && body.length > 1) {
    negated = true;
    body = body.slice(1);
  }

  const withNegation = <T extends BankSearchClause>(clause: T): T =>
    (negated ? { ...clause, negated: true } : clause) as T;

  if (body.startsWith('"') && body.endsWith('"')) {
    const value = body.slice(1, -1).trim();
    if (!value) return null;
    return withNegation({ kind: "text", value });
  }

  const numeric = /^(q|stack|level|grade)(>=|<=|>|<|:|=)(-?\d+)$/iu.exec(body);
  if (numeric) {
    const kind = numeric[1].toLowerCase() as "q" | "stack" | "level" | "grade";
    const op = parseNumericOp(numeric[2]);
    const value = Number(numeric[3]);
    if (!Number.isFinite(value)) return null;
    return withNegation({ kind, op, value });
  }

  const colon = /^([a-z]+):(.*)$/iu.exec(body);
  if (colon) {
    const field = colon[1].toLowerCase();
    const value = colon[2].trim().replace(/^"|"$/gu, "");
    if (!value) return null;

    if (field === "cat") {
      return withNegation({ kind: "category", value });
    }
    if (field === "is") {
      const flag = FLAG_ALIASES[value.toLowerCase()];
      if (!flag) return withNegation({ kind: "text", value: body });
      return withNegation({ kind: "is", value: flag });
    }
    if (FIELD_OPS.has(field) && field !== "is" && field !== "cat") {
      return withNegation({
        kind: field as "type" | "title" | "class" | "set" | "category" | "name",
        value,
      });
    }
  }

  return withNegation({ kind: "text", value: body });
}

/**
 * Parse bank search syntax.
 * - `OR` or commas (when no field ops) split alternative groups
 * - Within a group, clauses AND together (Gmail-style)
 */
export function parseBankSearchQuery(input: string): BankSearchQuery {
  const trimmed = input.trim();
  if (!trimmed) return { groups: [] };

  if (!hasFieldOrNumericSyntax(trimmed) && trimmed.includes(",")) {
    const groups = trimmed
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const clause = parseClause(part.includes(" ") ? `"${part}"` : part);
        return clause ? [clause] : [];
      })
      .filter((group) => group.length > 0);
    return { groups };
  }

  const orChunks = trimmed.split(/\s+OR\s+/u);
  const groups: BankSearchClause[][] = [];

  for (const chunk of orChunks) {
    const group: BankSearchClause[] = [];
    for (const token of tokenize(chunk.trim())) {
      if (!token || /^or$/iu.test(token)) continue;
      const clause = parseClause(token);
      if (clause) group.push(clause);
    }
    if (group.length) groups.push(group);
  }

  return { groups };
}

export function serializeBankSearchQuery(query: BankSearchQuery): string {
  return query.groups
    .map((group) =>
      group
        .map((clause) => {
          const prefix = clause.negated ? "-" : "";
          switch (clause.kind) {
            case "text":
              return `${prefix}${quoteIfNeeded(clause.value)}`;
            case "type":
            case "title":
            case "class":
            case "set":
            case "category":
            case "name":
              return `${prefix}${clause.kind}:${quoteIfNeeded(clause.value)}`;
            case "is":
              return `${prefix}is:${clause.value === "craftable" ? "craft" : clause.value}`;
            case "q":
            case "stack":
            case "level":
            case "grade": {
              const op = clause.op === "=" ? ":" : clause.op;
              return `${prefix}${clause.kind}${op}${clause.value}`;
            }
            default: {
              const _exhaustive: never = clause;
              return _exhaustive;
            }
          }
        })
        .join(" "),
    )
    .filter(Boolean)
    .join(" OR ");
}

function splitWords(value: string): string[] {
  return value
    .trim()
    .split(/[\s,]+/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function cartesianClauses(dimensions: BankSearchClause[][]): BankSearchClause[][] {
  if (!dimensions.length) return [[]];
  let combos: BankSearchClause[][] = [[]];
  for (const dimension of dimensions) {
    const next: BankSearchClause[][] = [];
    for (const prefix of combos) {
      for (const clause of dimension) {
        next.push([...prefix, clause]);
      }
    }
    combos = next;
  }
  return combos;
}

/** Build a query string from the advanced form (so the bar teaches the syntax). */
export function serializeAdvancedSearchForm(form: BankAdvancedSearchForm): string {
  const orDimensions: BankSearchClause[][] = [];
  if (form.types.length) {
    orDimensions.push(form.types.map((value) => ({ kind: "type" as const, value })));
  }
  if (form.titles.length) {
    orDimensions.push(form.titles.map((value) => ({ kind: "title" as const, value })));
  }
  if (form.classKeys.length) {
    orDimensions.push(form.classKeys.map((value) => ({ kind: "class" as const, value })));
  }
  if (form.setKeys.length) {
    orDimensions.push(form.setKeys.map((value) => ({ kind: "set" as const, value })));
  }
  if (form.categories.length) {
    orDimensions.push(form.categories.map((value) => ({ kind: "category" as const, value })));
  }

  const andClauses: BankSearchClause[] = [];
  for (const term of splitWords(form.allWords)) {
    andClauses.push({ kind: "text", value: term });
  }
  for (const term of splitWords(form.exclude)) {
    andClauses.push({ kind: "text", value: term, negated: true });
  }

  const minQ = Number(form.minQ);
  if (form.minQ.trim() && Number.isFinite(minQ)) {
    andClauses.push({ kind: "q", op: ">=", value: minQ });
  }
  const minLevel = Number(form.minLevel);
  if (form.minLevel.trim() && Number.isFinite(minLevel)) {
    andClauses.push({ kind: "level", op: ">=", value: minLevel });
  }
  const minGrade = Number(form.minGrade);
  if (form.minGrade.trim() && Number.isFinite(minGrade) && minGrade > 0) {
    andClauses.push({ kind: "grade", op: ">=", value: minGrade });
  }

  for (const [flag, enabled] of Object.entries(form.flags)) {
    if (!enabled) continue;
    const normalized = FLAG_ALIASES[flag] ?? (flag as BankSearchFlag);
    andClauses.push({ kind: "is", value: normalized === "craftable" ? "craft" : normalized });
  }

  const facetCombos = cartesianClauses(orDimensions);
  const anyTerms = splitWords(form.anyWords);
  const groups: BankSearchClause[][] = [];

  if (anyTerms.length) {
    for (const term of anyTerms) {
      for (const combo of facetCombos) {
        groups.push([{ kind: "text", value: term }, ...combo, ...andClauses]);
      }
    }
  } else {
    for (const combo of facetCombos) {
      if (!combo.length && !andClauses.length) continue;
      groups.push([...combo, ...andClauses]);
    }
  }

  return serializeBankSearchQuery({ groups });
}

function pushUnique(list: string[], value: string) {
  if (!list.includes(value)) list.push(value);
}

/** Best-effort reverse of serialize — enough to re-open the advanced panel. */
export function advancedSearchFormFromQuery(query: BankSearchQuery): BankAdvancedSearchForm {
  const form: BankAdvancedSearchForm = {
    ...EMPTY_BANK_ADVANCED_SEARCH,
    types: [],
    titles: [],
    classKeys: [],
    setKeys: [],
    categories: [],
    flags: {},
  };

  if (!query.groups.length) return form;

  const textPositives: string[] = [];

  // If every group is a single positive text clause, treat as anyWords.
  const onlySingleTextGroups =
    query.groups.length > 1 &&
    query.groups.every(
      (group) => group.length === 1 && group[0]?.kind === "text" && !group[0].negated,
    );

  if (onlySingleTextGroups) {
    form.anyWords = query.groups
      .map((group) => (group[0] as Extract<BankSearchClause, { kind: "text" }>).value)
      .join(" ");
    return form;
  }

  // If multiple groups share trailing filters, prefer anyWords from first clauses.
  if (query.groups.length > 1) {
    const heads = query.groups.map((group) => group[0]);
    if (heads.every((clause) => clause?.kind === "text" && !clause.negated)) {
      form.anyWords = [
        ...new Set(
          heads.map((clause) => (clause as Extract<BankSearchClause, { kind: "text" }>).value),
        ),
      ].join(" ");
    }
  }

  for (const group of query.groups) {
    for (const clause of group) {
      switch (clause.kind) {
        case "text":
          if (clause.negated) {
            form.exclude = [form.exclude, clause.value].filter(Boolean).join(" ");
          } else if (!form.anyWords) {
            textPositives.push(clause.value);
          }
          break;
        case "type":
          if (!clause.negated) pushUnique(form.types, clause.value);
          break;
        case "title":
          if (!clause.negated) pushUnique(form.titles, clause.value);
          break;
        case "class":
          if (!clause.negated) pushUnique(form.classKeys, clause.value);
          break;
        case "set":
          if (!clause.negated) pushUnique(form.setKeys, clause.value);
          break;
        case "category":
          if (!clause.negated) pushUnique(form.categories, clause.value);
          break;
        case "is":
          if (!clause.negated) {
            form.flags = { ...form.flags, [clause.value]: true };
            if (clause.value === "craft") form.flags = { ...form.flags, craftable: true };
          }
          break;
        case "q":
          if (!clause.negated && (clause.op === ">=" || clause.op === ">" || clause.op === "=")) {
            form.minQ = String(clause.op === ">" ? clause.value + 1 : clause.value);
          }
          break;
        case "level":
          if (!clause.negated && (clause.op === ">=" || clause.op === ">" || clause.op === "=")) {
            form.minLevel = String(clause.op === ">" ? clause.value + 1 : clause.value);
          }
          break;
        case "grade":
          if (!clause.negated && (clause.op === ">=" || clause.op === ">" || clause.op === "=")) {
            form.minGrade = String(clause.op === ">" ? clause.value + 1 : clause.value);
          }
          break;
        default:
          break;
      }
    }
  }

  if (!form.anyWords && textPositives.length) {
    form.allWords = [...new Set(textPositives)].join(" ");
  }

  return form;
}

function itemHasSearchFlag(
  gItem: GItem,
  itemName: string,
  flag: BankSearchFlag,
  G: GData | undefined,
): boolean {
  const extras = gItem as GItem & {
    e?: number | boolean;
    event?: boolean;
    legacy?: boolean;
  };
  switch (flag) {
    case "exchange":
      return Boolean(extras.e);
    case "upgrade":
      return Boolean(gItem.upgrade);
    case "compound":
      return Boolean(gItem.compound);
    case "craft":
    case "craftable": {
      const craftMap = (G as CustomGData | undefined)?.craft as Record<string, GCraft> | undefined;
      return Boolean(craftMap?.[itemName]);
    }
    case "event":
      return Boolean(extras.event);
    case "legacy":
      return Boolean(extras.legacy);
    default: {
      const _exhaustive: never = flag;
      return _exhaustive;
    }
  }
}

function matchesTextTerm(
  item: BankSearchableItem,
  G: GData | undefined,
  term: string,
  nameOnly = false,
): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;

  if (nameOnly) {
    const itemKey = item.name as ItemKey;
    const gItem = G?.items[itemKey];
    if (item.name.toLowerCase().includes(needle)) return true;
    if (gItem?.name.toLowerCase().includes(needle)) return true;
    return false;
  }

  if ((item.category || getBankItemCategory(item.name, G)).toLowerCase().includes(needle)) {
    return true;
  }
  if (String(item.level).includes(needle)) return true;
  if (item.p && item.p.toLowerCase().includes(needle)) return true;

  const itemKey = item.name as ItemKey;
  const gItem = G?.items[itemKey];
  if (gItem && itemMatchesSearch(itemKey, gItem, needle)) return true;

  if (G?.titles) {
    const titleName = getTitleName(item, G);
    if (titleName.toLowerCase().includes(needle)) return true;
  }

  return item.name.toLowerCase().includes(needle);
}

function clauseMatchesItem(
  item: BankSearchableItem,
  G: GData | undefined,
  clause: BankSearchClause,
): boolean {
  const gItem = G?.items[item.name as ItemKey];
  let hit = false;

  switch (clause.kind) {
    case "text":
      hit = matchesTextTerm(item, G, clause.value);
      break;
    case "name":
      hit = matchesTextTerm(item, G, clause.value, true);
      break;
    case "type":
      hit = Boolean(gItem?.type && gItem.type.toLowerCase() === clause.value.toLowerCase());
      break;
    case "title":
      hit = Boolean(item.p && item.p.toLowerCase() === clause.value.toLowerCase());
      break;
    case "class":
      hit = Boolean(gItem && itemMatchesClasses(gItem, [clause.value.toLowerCase()]));
      break;
    case "set": {
      const setKey = (gItem as { set?: string } | undefined)?.set;
      hit = Boolean(setKey && setKey.toLowerCase() === clause.value.toLowerCase());
      break;
    }
    case "category": {
      const category = item.category || getBankItemCategory(item.name, G);
      hit = category.toLowerCase().includes(clause.value.toLowerCase());
      break;
    }
    case "is":
      hit = Boolean(gItem && itemHasSearchFlag(gItem, item.name, clause.value, G));
      break;
    case "q":
      hit = compareNumber(item.q, clause.op, clause.value);
      break;
    case "stack":
      hit = compareNumber(item.stack, clause.op, clause.value);
      break;
    case "level":
      hit = compareNumber(item.level, clause.op, clause.value);
      break;
    case "grade": {
      if (!gItem) {
        hit = false;
        break;
      }
      hit = compareNumber(getItemGrade(gItem, item.level), clause.op, clause.value);
      break;
    }
    default: {
      const _exhaustive: never = clause;
      return _exhaustive;
    }
  }

  return clause.negated ? !hit : hit;
}

const OR_FIELD_KINDS = new Set(["type", "title", "class", "set", "category"]);

function groupMatchesItem(
  item: BankSearchableItem,
  G: GData | undefined,
  group: BankSearchClause[],
): boolean {
  const orBuckets = new Map<string, BankSearchClause[]>();
  const otherClauses: BankSearchClause[] = [];

  for (const clause of group) {
    if (!clause.negated && OR_FIELD_KINDS.has(clause.kind)) {
      const bucket = orBuckets.get(clause.kind) ?? [];
      bucket.push(clause);
      orBuckets.set(clause.kind, bucket);
      continue;
    }
    otherClauses.push(clause);
  }

  for (const clause of otherClauses) {
    if (!clauseMatchesItem(item, G, clause)) return false;
  }

  for (const clauses of orBuckets.values()) {
    let anyHit = false;
    for (const clause of clauses) {
      if (clauseMatchesItem(item, G, clause)) {
        anyHit = true;
        break;
      }
    }
    if (!anyHit) return false;
  }

  return true;
}

export function bankItemMatchesQuery(
  item: BankSearchableItem,
  G: GData | undefined,
  query: BankSearchQuery,
): boolean {
  if (!query.groups.length) return true;
  for (const group of query.groups) {
    if (groupMatchesItem(item, G, group)) return true;
  }
  return false;
}

export function bankItemMatchesSearchQuery(
  item: BankSearchableItem,
  G: GData | undefined,
  searchTerm: string,
): boolean {
  const trimmed = searchTerm.trim();
  if (!trimmed) return true;
  return bankItemMatchesQuery(item, G, parseBankSearchQuery(trimmed));
}
