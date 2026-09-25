/** Shared query-search suggestion types — Market/Bank/Items/Monsters profiles. */

export type QuerySearchSuggestion = {
  kind: "op" | "value";
  label: string;
  hint: string;
  insert?: string;
  value?: string;
};

export type QuerySearchSection = {
  title: string;
  rows: QuerySearchSuggestion[];
};

export type QuerySearchMenu = {
  sections: QuerySearchSection[];
  flat: QuerySearchSuggestion[];
};

export type NumericCompareOp = "=" | ">" | ">=" | "<" | "<=";

export type ParsedAmount = { op: NumericCompareOp; n: number };

export type AttrSpec =
  | { kind: "any"; key: string }
  | { kind: "cmp"; key: string; op: NumericCompareOp; n: number };

/** Per-surface search context — drives ops, suggestions, placeholders. */
export type SearchContextId = "bank" | "market" | "catalog" | "gear" | "luck" | "monster" | "npc";

export type SearchContextProfile = {
  id: SearchContextId;
  trailingOps: readonly string[];
  aliases: Record<string, string>;
  placeholder: string;
  footer: string;
};

export type SurfaceOpDef = {
  /** Canonical op name without colon */
  name: string;
  hint: string;
  /** Suggestion insert text, e.g. `attr:` or `hp:>=` */
  insert: string;
  /** Extra trailing aliases that resolve to this op (e.g. cat → category). Listed separately in aliases map usually. */
};
