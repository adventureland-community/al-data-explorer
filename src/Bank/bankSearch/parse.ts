import {
  ITEM_FLAG_ALIASES,
  parseAttrSpecs,
  parseCompareOpToken,
  parseOrGroups,
  serializeAttrSpecs,
  splitTokenNegation,
  stripQueryQuotes,
  withClauseNegation,
} from "../../Shared/querySearch";

import type { BankSearchClause, BankSearchQuery } from "./types";

const FIELD_OPS = new Set([
  "type",
  "title",
  "class",
  "set",
  "category",
  "cat",
  "name",
  "is",
  "attr",
]);

function quoteIfNeeded(value: string): string {
  if (!value) return '""';
  if (/[\s"]/u.test(value)) return `"${value.replace(/"/gu, "")}"`;
  return value;
}

export function hasFieldSyntax(input: string): boolean {
  return (
    /(?:^|\s)-?(?:type|title|class|set|category|cat|name|is|attr):/iu.test(input) ||
    /(?:^|\s)-?(?:q|stack|level|grade)\s*(?:>=|<=|>|<|:|=)/iu.test(input)
  );
}

function parseClause(token: string): BankSearchClause | null {
  const { negated, body: rawBody } = splitTokenNegation(token);
  const body = rawBody;

  const withNegation = <T extends BankSearchClause>(clause: T): T =>
    withClauseNegation(clause, negated);

  if (body.startsWith('"') && body.endsWith('"')) {
    const value = stripQueryQuotes(body).trim();
    if (!value) return null;
    return withNegation({ kind: "text", value });
  }

  const numeric = /^(q|stack|level|grade)(>=|<=|>|<|:|=)(-?\d+)$/iu.exec(body);
  if (numeric) {
    const kind = numeric[1].toLowerCase() as "q" | "stack" | "level" | "grade";
    const op = parseCompareOpToken(numeric[2]);
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
      const flag = ITEM_FLAG_ALIASES[value.toLowerCase()];
      if (!flag) return withNegation({ kind: "text", value: body });
      return withNegation({ kind: "is", value: flag });
    }
    if (field === "attr") {
      const specs = parseAttrSpecs(value);
      if (!specs.length) return null;
      return withNegation({ kind: "attr", specs });
    }
    if (FIELD_OPS.has(field) && field !== "is" && field !== "cat" && field !== "attr") {
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
  return {
    groups: parseOrGroups(input, parseClause, {
      allowPipe: false,
      commaOrWhenNoFields: true,
      hasFieldSyntax,
    }),
  };
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
            case "attr":
              return `${prefix}attr:${serializeAttrSpecs(clause.specs)}`;
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
