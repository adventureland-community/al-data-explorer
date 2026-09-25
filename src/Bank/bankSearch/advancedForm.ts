import { ITEM_FLAG_ALIASES, type AttrSpec } from "../../Shared/querySearch";

import { serializeBankSearchQuery } from "./parse";
import type {
  BankAdvancedSearchForm,
  BankSearchClause,
  BankSearchFlag,
  BankSearchQuery,
} from "./types";
import { EMPTY_BANK_ADVANCED_SEARCH } from "./types";

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

  const attrKey = form.attrKey.trim().toLowerCase();
  if (attrKey) {
    const specs: AttrSpec[] = [];
    const minAttr = Number(form.attrMin);
    const maxAttr = Number(form.attrMax);
    if (form.attrMin.trim() && Number.isFinite(minAttr)) {
      specs.push({ kind: "cmp", key: attrKey, op: ">=", n: minAttr });
    }
    if (form.attrMax.trim() && Number.isFinite(maxAttr)) {
      specs.push({ kind: "cmp", key: attrKey, op: "<=", n: maxAttr });
    }
    if (!specs.length) {
      specs.push({ kind: "any", key: attrKey });
    }
    andClauses.push({ kind: "attr", specs });
  }

  for (const [flag, enabled] of Object.entries(form.flags)) {
    if (!enabled) continue;
    const normalized = ITEM_FLAG_ALIASES[flag] ?? (flag as BankSearchFlag);
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
        case "attr":
          if (!clause.negated && clause.specs[0]) {
            form.attrKey = clause.specs[0].key;
            for (const spec of clause.specs) {
              if (spec.kind === "any") continue;
              if (spec.kind !== "cmp") continue;
              if (spec.op === ">=" || spec.op === ">" || spec.op === "=") {
                form.attrMin = String(spec.op === ">" ? spec.n + 1 : spec.n);
              }
              if (spec.op === "<=" || spec.op === "<") {
                form.attrMax = String(spec.op === "<" ? spec.n - 1 : spec.n);
              }
            }
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
