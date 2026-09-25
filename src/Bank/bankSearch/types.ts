import type { ItemInfoPValues } from "typed-adventureland";

import type { AttrSpec, ItemSearchFlag, NumericCompareOp } from "../../Shared/querySearch";

/** Minimal item shape for search matching (aggregated or pack slot). */
export type BankSearchableItem = {
  p?: ItemInfoPValues;
  level: number;
  name: string;
  q: number;
  stack: number;
  category: string;
};

export type BankSearchFlag = ItemSearchFlag;

export type { NumericCompareOp, AttrSpec };

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
  | { kind: "grade"; op: NumericCompareOp; value: number; negated?: boolean }
  | { kind: "attr"; specs: AttrSpec[]; negated?: boolean };

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
  /** Attribute key for attr: (e.g. str). */
  attrKey: string;
  /** Minimum attribute value (≥). */
  attrMin: string;
  /** Optional max attribute value (≤). */
  attrMax: string;
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
  attrKey: "",
  attrMin: "",
  attrMax: "",
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
  { op: "attr:", meaning: "Resolved item stat range", example: "attr:str>=20" },
];
