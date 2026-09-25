import { compareAmount, parseAmount } from "./amount";
import type { NumericCompareOp, ParsedAmount } from "./types";

export function tokenizeQuery(input: string): string[] {
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

export function stripQueryQuotes(s: string): string {
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

export function splitTokenNegation(token: string): { negated: boolean; body: string } {
  if (token.startsWith("-") && token.length > 1) {
    return { negated: true, body: token.slice(1) };
  }
  return { negated: false, body: token };
}

/** Attach negation without reverse-inferring T from the caller's return type. */
export function withClauseNegation<T>(clause: T, negated: boolean): T {
  if (!negated) return clause;
  return { ...clause, negated: true };
}

export function parseCompareOpToken(raw: string): NumericCompareOp {
  if (raw === ">=") return ">=";
  if (raw === "<=") return "<=";
  if (raw === ">") return ">";
  if (raw === "<") return "<";
  return "=";
}

export function parseAmountList(raw: string): ParsedAmount[] {
  const amts: ParsedAmount[] = [];
  for (const part of String(raw || "").split(/[|,]/u)) {
    const amt = parseAmount(part.trim());
    if (amt) amts.push(amt);
  }
  return amts;
}

export function anyAmountMatches(n: number, amts: ParsedAmount[]): boolean {
  for (const amt of amts) {
    if (compareAmount(n, amt)) return true;
  }
  return false;
}

export function parseOrGroups<C>(
  input: string,
  parseClause: (token: string) => C | null,
  options?: {
    allowPipe?: boolean;
    commaOrWhenNoFields?: boolean;
    hasFieldSyntax?: (s: string) => boolean;
  },
): C[][] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const allowPipe = options?.allowPipe !== false;
  const commaOrWhenNoFields = options?.commaOrWhenNoFields === true;
  const hasFieldSyntax = options?.hasFieldSyntax;

  if (commaOrWhenNoFields && hasFieldSyntax && !hasFieldSyntax(trimmed) && trimmed.includes(",")) {
    const groups: C[][] = [];
    for (const part of trimmed.split(",")) {
      const p = part.trim();
      if (!p) continue;
      const clause = parseClause(p.includes(" ") ? `"${p}"` : p);
      if (clause) groups.push([clause]);
    }
    return groups;
  }

  const splitter = allowPipe ? /\s+(?:OR|\|)\s+/iu : /\s+OR\s+/u;
  const orChunks = trimmed.split(splitter);
  const groups: C[][] = [];

  for (const chunk of orChunks) {
    const group: C[] = [];
    for (const token of tokenizeQuery(chunk.trim())) {
      if (!token || /^or$/iu.test(token) || token === "|") continue;
      const clause = parseClause(token);
      if (clause) group.push(clause);
    }
    if (group.length) groups.push(group);
  }

  return groups;
}

export function queryMatchesAnyGroup<E, C>(
  groups: C[][],
  entity: E,
  groupMatches: (entity: E, group: C[]) => boolean,
): boolean {
  if (!groups.length) return true;
  for (const group of groups) {
    if (groupMatches(entity, group)) return true;
  }
  return false;
}

export function groupAndMatch<E, C>(
  entity: E,
  group: C[],
  clauseMatches: (entity: E, clause: C) => boolean,
): boolean {
  for (const clause of group) {
    if (!clauseMatches(entity, clause)) return false;
  }
  return true;
}

export function groupMatchWithOrFields<E, C extends { kind: string; negated?: boolean }>(
  entity: E,
  group: C[],
  orFieldKinds: ReadonlySet<string>,
  clauseMatches: (entity: E, clause: C) => boolean,
): boolean {
  const orBuckets = new Map<string, C[]>();
  const otherClauses: C[] = [];

  for (const clause of group) {
    if (!clause.negated && orFieldKinds.has(clause.kind)) {
      const bucket = orBuckets.get(clause.kind) ?? [];
      bucket.push(clause);
      orBuckets.set(clause.kind, bucket);
      continue;
    }
    otherClauses.push(clause);
  }

  for (const clause of otherClauses) {
    if (!clauseMatches(entity, clause)) return false;
  }

  for (const clauses of orBuckets.values()) {
    let anyHit = false;
    for (const clause of clauses) {
      if (clauseMatches(entity, clause)) {
        anyHit = true;
        break;
      }
    }
    if (!anyHit) return false;
  }

  return true;
}
