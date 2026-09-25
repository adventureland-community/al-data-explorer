/**
 * Monster search — monster-only ops (hp, respawn, drop). No item type/price ops.
 */

import type { GMonster, MonsterKey } from "typed-adventureland";

import {
  MONSTER_ALIASES,
  MONSTER_NUMERIC_KEYS,
  MONSTER_OPS,
  anyAmountMatches,
  emptyQuerySearchMenu,
  freeTokenNeedle,
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

export type MonsterSearchable = GMonster & {
  drops?: string;
  spawns?: string[];
  achievements?: unknown;
};

export type MonsterClause =
  | { kind: "text"; value: string; negated?: boolean }
  | { kind: "name"; value: string; negated?: boolean }
  | { kind: "drop"; value: string; negated?: boolean }
  | { kind: "achievement"; value: string; negated?: boolean }
  | { kind: "map"; value: string; negated?: boolean }
  | { kind: "numeric"; key: string; amts: ParsedAmount[]; negated?: boolean }
  | { kind: "attr"; specs: AttrSpec[]; negated?: boolean };

export type MonsterSearchQuery = { groups: MonsterClause[][] };

export type MonsterAdvancedForm = {
  anyWords: string;
  drop: string;
  achievement: string;
  hpMin: string;
  hpMax: string;
  respawnMin: string;
  respawnMax: string;
};

export const EMPTY_MONSTER_ADVANCED: MonsterAdvancedForm = {
  anyWords: "",
  drop: "",
  achievement: "",
  hpMin: "",
  hpMax: "",
  respawnMin: "",
  respawnMax: "",
};

const NUMERIC_KEYS = new Set(MONSTER_NUMERIC_KEYS);

const MONSTER_FIELD_NAMES = new Set([
  ...MONSTER_OPS.map((op) => op.name),
  ...Object.keys(MONSTER_ALIASES),
]);

type MonsterMatchCtx = { key: MonsterKey; monster: MonsterSearchable };

function parseClause(token: string): MonsterClause | null {
  const { negated, body } = splitTokenNegation(token);
  const withNeg = <T extends MonsterClause>(clause: T): T => withClauseNegation(clause, negated);

  if (body.startsWith('"') && body.endsWith('"')) {
    const value = stripQueryQuotes(body).trim();
    if (!value) return null;
    return withNeg({ kind: "text", value });
  }

  // Bare hp>=10000 style
  const bareNum =
    /^(hp|mp|xp|attack|respawn|armor|resistance|range|speed|frequency)(>=|<=|>|<|=)(.+)$/iu.exec(
      body,
    );
  if (bareNum) {
    const key = bareNum[1].toLowerCase();
    const amt = parseAmount(bareNum[2] + bareNum[3]);
    if (amt) return withNeg({ kind: "numeric", key, amts: [amt] });
  }

  const m = /^([a-z]+):(.*)$/iu.exec(body);
  if (!m) return withNeg({ kind: "text", value: body });

  const field = m[1].toLowerCase();
  if (!MONSTER_FIELD_NAMES.has(field)) {
    return withNeg({ kind: "text", value: body });
  }
  const raw = stripQueryQuotes(m[2].trim());

  if (field === "item") return withNeg({ kind: "drop", value: raw });
  if (field === "spawn") return withNeg({ kind: "map", value: raw });
  if (field === "name") return withNeg({ kind: "name", value: raw });
  if (field === "drop") return withNeg({ kind: "drop", value: raw });
  if (field === "achievement") {
    return withNeg({ kind: "achievement", value: raw });
  }
  if (field === "map") return withNeg({ kind: "map", value: raw });
  if (field === "attr") {
    const specs = parseAttrSpecs(raw);
    if (!specs.length) return null;
    return withNeg({ kind: "attr", specs });
  }
  if (NUMERIC_KEYS.has(field)) {
    const amts = parseAmountList(raw);
    if (!amts.length) return null;
    return withNeg({ kind: "numeric", key: field, amts });
  }
  return withNeg({ kind: "text", value: body });
}

export function parseMonsterSearchQuery(input: string): MonsterSearchQuery {
  return { groups: parseOrGroups(input, parseClause) };
}

export function serializeMonsterAdvancedForm(form: MonsterAdvancedForm): string {
  const parts: string[] = [];
  if (form.anyWords.trim()) parts.push(form.anyWords.trim());
  if (form.drop.trim()) parts.push(`drop:${form.drop.trim()}`);
  if (form.achievement.trim()) parts.push(`achievement:${form.achievement.trim()}`);
  if (form.hpMin.trim()) parts.push(`hp:>=${form.hpMin.trim()}`);
  if (form.hpMax.trim()) parts.push(`hp:<=${form.hpMax.trim()}`);
  if (form.respawnMin.trim()) parts.push(`respawn:>=${form.respawnMin.trim()}`);
  if (form.respawnMax.trim()) parts.push(`respawn:<=${form.respawnMax.trim()}`);
  return parts.join(" ");
}

export function monsterAdvancedFromQuery(query: MonsterSearchQuery): MonsterAdvancedForm {
  const form: MonsterAdvancedForm = { ...EMPTY_MONSTER_ADVANCED };
  const texts: string[] = [];
  for (const group of query.groups) {
    for (const clause of group) {
      if (clause.negated) continue;
      if (clause.kind === "text" || clause.kind === "name") texts.push(clause.value);
      if (clause.kind === "drop") form.drop = clause.value;
      if (clause.kind === "achievement") form.achievement = clause.value;
      if (clause.kind === "numeric") {
        for (const amt of clause.amts) {
          if (clause.key === "hp") {
            if (amt.op === ">=" || amt.op === ">" || amt.op === "=") form.hpMin = String(amt.n);
            if (amt.op === "<=" || amt.op === "<") form.hpMax = String(amt.n);
          }
          if (clause.key === "respawn") {
            if (amt.op === ">=" || amt.op === ">" || amt.op === "=")
              form.respawnMin = String(amt.n);
            if (amt.op === "<=" || amt.op === "<") form.respawnMax = String(amt.n);
          }
        }
      }
    }
  }
  form.anyWords = texts.join(" ");
  return form;
}

function monsterNumeric(monster: MonsterSearchable, key: string): number {
  if (!(MONSTER_NUMERIC_KEYS as readonly string[]).includes(key)) return 0;
  const v = monster[key as keyof MonsterSearchable];
  return typeof v === "number" ? v : 0;
}

function clauseMatches(ctx: MonsterMatchCtx, clause: MonsterClause): boolean {
  const { key, monster } = ctx;
  let hit = false;
  switch (clause.kind) {
    case "text":
    case "name": {
      const needle = clause.value.toLowerCase();
      hit =
        key.toLowerCase().includes(needle) ||
        String(monster.name || "")
          .toLowerCase()
          .includes(needle);
      break;
    }
    case "drop": {
      const needle = clause.value.toLowerCase();
      hit = Boolean(monster.drops && String(monster.drops).toLowerCase().includes(needle));
      break;
    }
    case "achievement": {
      const needle = clause.value.toLowerCase();
      const list = Array.isArray(monster.achievements) ? monster.achievements : [];
      hit = list.some(
        (a) =>
          Array.isArray(a) &&
          String(a[2] ?? "")
            .toLowerCase()
            .includes(needle),
      );
      break;
    }
    case "map": {
      const needle = clause.value.toLowerCase();
      const spawns = monster.spawns ?? [];
      hit = spawns.some((s) => String(s).toLowerCase().includes(needle));
      break;
    }
    case "numeric": {
      const n = monsterNumeric(monster, clause.key);
      hit = anyAmountMatches(n, clause.amts);
      break;
    }
    case "attr": {
      const stats: Record<string, number | undefined> = {};
      for (const k of MONSTER_NUMERIC_KEYS) {
        stats[k] = monsterNumeric(monster, k);
      }
      hit = statsMatchAttrSpecs(stats, clause.specs);
      break;
    }
    default: {
      const _exhaustive: never = clause;
      return _exhaustive;
    }
  }
  return clause.negated ? !hit : hit;
}

export function monsterMatchesQuery(
  key: MonsterKey,
  monster: MonsterSearchable,
  query: MonsterSearchQuery,
): boolean {
  return queryMatchesAnyGroup(query.groups, { key, monster }, (entity, group) =>
    groupAndMatch(entity, group, clauseMatches),
  );
}

export function monsterMatchesSearch(
  key: MonsterKey,
  monster: MonsterSearchable,
  search: string,
): boolean {
  const trimmed = search.trim();
  if (!trimmed) return true;
  return monsterMatchesQuery(key, monster, parseMonsterSearchQuery(trimmed));
}

export function buildMonsterSearchSuggestions(raw: string): QuerySearchMenu {
  const menu = emptyQuerySearchMenu();
  const trailing = trailingFieldContext(raw, trailingOpsFor("monster"), MONSTER_ALIASES);
  const needle = (trailing?.value || "").toLowerCase();

  if (trailing?.op === "attr") {
    pushAttrKeySuggestions(menu, MONSTER_NUMERIC_KEYS, needle, "Stats");
    return menu;
  }

  if (trailing && NUMERIC_KEYS.has(trailing.op)) {
    // Already typing a compare (hp:>=50) — no value menu needed
    if (/^[<>]=?|=/.test(needle) || needle.length > 0) return menu;
    pushQuerySearchSection(menu, "Compare", [
      { kind: "value" as const, label: ">=", hint: `${trailing.op}:>=…`, value: ">=" },
      { kind: "value" as const, label: "<=", hint: `${trailing.op}:<=…`, value: "<=" },
      { kind: "value" as const, label: ">", hint: `${trailing.op}:>…`, value: ">" },
      { kind: "value" as const, label: "<", hint: `${trailing.op}:<…`, value: "<" },
    ]);
    return menu;
  }

  if (trailing) return menu;

  pushOperatorSuggestions(menu, MONSTER_OPS, freeTokenNeedle(raw));
  return menu;
}
