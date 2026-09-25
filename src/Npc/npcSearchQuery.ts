/**
 * NPC catalog search — role / map / sells / is flags. No item attr ops.
 */

import {
  NPC_ALIASES,
  NPC_OPS,
  emptyQuerySearchMenu,
  freeTokenNeedle,
  groupAndMatch,
  parseOrGroups,
  pushFlagValueSuggestions,
  pushOperatorSuggestions,
  pushQuerySearchSection,
  queryMatchesAnyGroup,
  splitTokenNegation,
  stripQueryQuotes,
  trailingFieldContext,
  trailingOpsFor,
  withClauseNegation,
  type QuerySearchMenu,
} from "../Shared/querySearch";
import type { NpcCatalogRow } from "../gameData/npcCatalog";

export type NpcClause =
  | { kind: "text"; value: string; negated?: boolean }
  | { kind: "name"; value: string; negated?: boolean }
  | { kind: "role"; value: string; negated?: boolean }
  | { kind: "map"; value: string; negated?: boolean }
  | { kind: "token"; value: string; negated?: boolean }
  | { kind: "quest"; value: string; negated?: boolean }
  | { kind: "sells"; value: string; negated?: boolean }
  | { kind: "flag"; flag: NpcSearchFlag; negated?: boolean };

export type NpcSearchFlag = "shop" | "ignored" | "moving";

export type NpcSearchQuery = { groups: NpcClause[][] };

export type NpcAdvancedForm = {
  anyWords: string;
  role: string;
  map: string;
  token: string;
  quest: string;
  sells: string;
  shopOnly: boolean;
  includeIgnored: boolean;
  movingOnly: boolean;
};

export const EMPTY_NPC_ADVANCED: NpcAdvancedForm = {
  anyWords: "",
  role: "",
  map: "",
  token: "",
  quest: "",
  sells: "",
  shopOnly: false,
  includeIgnored: false,
  movingOnly: false,
};

const NPC_FIELD_NAMES = new Set([...NPC_OPS.map((op) => op.name), ...Object.keys(NPC_ALIASES)]);

const NPC_FLAGS: readonly { value: NpcSearchFlag; hint: string }[] = [
  { value: "shop", hint: "Sells items" },
  { value: "ignored", hint: "Hidden / ignored NPC" },
  { value: "moving", hint: "Moving NPC" },
];

function parseClause(token: string): NpcClause | null {
  const { negated, body } = splitTokenNegation(token);
  const withNeg = <T extends NpcClause>(clause: T): T => withClauseNegation(clause, negated);

  if (body.startsWith('"') && body.endsWith('"')) {
    const value = stripQueryQuotes(body).trim();
    if (!value) return null;
    return withNeg({ kind: "text", value });
  }

  const m = /^([a-z]+):(.*)$/iu.exec(body);
  if (!m) return withNeg({ kind: "text", value: body });

  const field = m[1].toLowerCase();
  if (!NPC_FIELD_NAMES.has(field)) {
    return withNeg({ kind: "text", value: body });
  }
  const raw = stripQueryQuotes(m[2].trim());
  if (field === "type") return withNeg({ kind: "role", value: raw });
  if (field === "item") return withNeg({ kind: "sells", value: raw });
  if (field === "name") return withNeg({ kind: "name", value: raw });
  if (field === "role") return withNeg({ kind: "role", value: raw });
  if (field === "map") return withNeg({ kind: "map", value: raw });
  if (field === "token") return withNeg({ kind: "token", value: raw });
  if (field === "quest") return withNeg({ kind: "quest", value: raw });
  if (field === "sells") return withNeg({ kind: "sells", value: raw });
  if (field === "is") {
    const flag = raw.toLowerCase() as NpcSearchFlag;
    if (flag !== "shop" && flag !== "ignored" && flag !== "moving") return null;
    return withNeg({ kind: "flag", flag });
  }
  return withNeg({ kind: "text", value: body });
}

export function parseNpcSearchQuery(input: string): NpcSearchQuery {
  return { groups: parseOrGroups(input, parseClause) };
}

export function serializeNpcAdvancedForm(form: NpcAdvancedForm): string {
  const parts: string[] = [];
  if (form.anyWords.trim()) parts.push(form.anyWords.trim());
  if (form.role.trim()) parts.push(`role:${form.role.trim()}`);
  if (form.map.trim()) parts.push(`map:${form.map.trim()}`);
  if (form.token.trim()) parts.push(`token:${form.token.trim()}`);
  if (form.quest.trim()) parts.push(`quest:${form.quest.trim()}`);
  if (form.sells.trim()) parts.push(`sells:${form.sells.trim()}`);
  if (form.shopOnly) parts.push("is:shop");
  if (form.includeIgnored) parts.push("is:ignored");
  if (form.movingOnly) parts.push("is:moving");
  return parts.join(" ");
}

export function npcAdvancedFromQuery(query: NpcSearchQuery): NpcAdvancedForm {
  const form: NpcAdvancedForm = { ...EMPTY_NPC_ADVANCED };
  const texts: string[] = [];
  for (const group of query.groups) {
    for (const clause of group) {
      if (clause.negated) continue;
      if (clause.kind === "text" || clause.kind === "name") texts.push(clause.value);
      if (clause.kind === "role") form.role = clause.value;
      if (clause.kind === "map") form.map = clause.value;
      if (clause.kind === "token") form.token = clause.value;
      if (clause.kind === "quest") form.quest = clause.value;
      if (clause.kind === "sells") form.sells = clause.value;
      if (clause.kind === "flag") {
        if (clause.flag === "shop") form.shopOnly = true;
        if (clause.flag === "ignored") form.includeIgnored = true;
        if (clause.flag === "moving") form.movingOnly = true;
      }
    }
  }
  form.anyWords = texts.join(" ");
  return form;
}

export function npcAdvancedHasValues(form: NpcAdvancedForm): boolean {
  return Boolean(serializeNpcAdvancedForm(form).trim());
}

/** Fold legacy `role` / `map` URL facet params into a query string. */
export function serializeLegacyNpcFacets(opts: { roles?: string[]; mapKeys?: string[] }): string {
  const parts: string[] = [];
  for (const role of opts.roles ?? []) {
    if (role.trim()) parts.push(`role:${role.trim()}`);
  }
  for (const mapKey of opts.mapKeys ?? []) {
    if (mapKey.trim()) parts.push(`map:${mapKey.trim()}`);
  }
  return parts.join(" ");
}

function queryWantsIgnored(query: NpcSearchQuery): boolean {
  for (const group of query.groups) {
    for (const clause of group) {
      if (clause.kind === "flag" && clause.flag === "ignored" && !clause.negated) return true;
    }
  }
  return false;
}

function clauseMatches(row: NpcCatalogRow, clause: NpcClause): boolean {
  let hit = false;
  switch (clause.kind) {
    case "text":
    case "name": {
      const needle = clause.value.toLowerCase();
      hit =
        row.id.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        (clause.kind === "text" &&
          (`${row.role} ${row.token ?? ""} ${row.quest ?? ""}`.toLowerCase().includes(needle) ||
            row.maps.some(
              (loc) =>
                loc.mapKey.toLowerCase().includes(needle) ||
                (loc.mapName ?? "").toLowerCase().includes(needle),
            )));
      break;
    }
    case "role": {
      hit = row.role.toLowerCase().includes(clause.value.toLowerCase());
      break;
    }
    case "map": {
      const needle = clause.value.toLowerCase();
      hit = row.maps.some(
        (loc) =>
          loc.mapKey.toLowerCase().includes(needle) ||
          (loc.mapName ?? "").toLowerCase().includes(needle),
      );
      break;
    }
    case "token": {
      hit = Boolean(row.token && row.token.toLowerCase().includes(clause.value.toLowerCase()));
      break;
    }
    case "quest": {
      hit = Boolean(row.quest && row.quest.toLowerCase().includes(clause.value.toLowerCase()));
      break;
    }
    case "sells": {
      const needle = clause.value.toLowerCase();
      hit = row.shopItemKeys.some((key) => key.toLowerCase().includes(needle));
      break;
    }
    case "flag": {
      if (clause.flag === "shop") hit = row.shopItemCount > 0;
      else if (clause.flag === "ignored") hit = row.ignored;
      else hit = row.moving;
      break;
    }
    default: {
      const _exhaustive: never = clause;
      return _exhaustive;
    }
  }
  return clause.negated ? !hit : hit;
}

export function npcMatchesQuery(row: NpcCatalogRow, query: NpcSearchQuery): boolean {
  if (row.ignored && !queryWantsIgnored(query)) return false;
  return queryMatchesAnyGroup(query.groups, row, (entity, group) =>
    groupAndMatch(entity, group, clauseMatches),
  );
}

export function npcMatchesSearch(row: NpcCatalogRow, search: string): boolean {
  const trimmed = search.trim();
  if (!trimmed) {
    return !row.ignored;
  }
  return npcMatchesQuery(row, parseNpcSearchQuery(trimmed));
}

export function buildNpcSearchSuggestions(
  raw: string,
  opts?: { roles?: readonly string[]; mapKeys?: readonly string[] },
): QuerySearchMenu {
  const menu = emptyQuerySearchMenu();
  const trailing = trailingFieldContext(raw, trailingOpsFor("npc"), NPC_ALIASES);
  const needle = (trailing?.value || "").toLowerCase();

  if (trailing?.op === "is") {
    pushFlagValueSuggestions(menu, NPC_FLAGS, needle);
    return menu;
  }

  if (trailing?.op === "role" && opts?.roles?.length) {
    const rows = [];
    for (const role of opts.roles) {
      if (needle && !role.toLowerCase().includes(needle)) continue;
      rows.push({
        kind: "value" as const,
        label: role,
        hint: `role:${role}`,
        value: role,
      });
    }
    pushQuerySearchSection(menu, "Roles", rows);
    return menu;
  }

  if (trailing?.op === "map" && opts?.mapKeys?.length) {
    const rows = [];
    for (const mapKey of opts.mapKeys) {
      if (needle && !mapKey.toLowerCase().includes(needle)) continue;
      rows.push({
        kind: "value" as const,
        label: mapKey,
        hint: `map:${mapKey}`,
        value: mapKey,
      });
    }
    pushQuerySearchSection(menu, "Maps", rows);
    return menu;
  }

  if (trailing) return menu;

  pushOperatorSuggestions(menu, NPC_OPS, freeTokenNeedle(raw));
  return menu;
}
