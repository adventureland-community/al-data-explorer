/**
 * Apply / trailing-field helpers for query search menus.
 */

import type { QuerySearchMenu, QuerySearchSection, QuerySearchSuggestion } from "./types";

/**
 * Detect `op:value` (or `-op:value`) at the end of the query for value completions.
 */
export function trailingFieldContext(
  raw: string,
  ops: readonly string[],
  aliases: Record<string, string> = {},
): {
  op: string;
  value: string;
  negate: boolean;
  start: number;
} | null {
  if (!ops.length) return null;
  const aliasKeys = Object.keys(aliases);
  const names = [...ops, ...aliasKeys].join("|");
  if (!names) return null;
  const re = new RegExp(`(^|\\s)(-?)(${names}):([^\\s]*)$`, "i");
  const s = String(raw || "");
  const m = re.exec(s);
  if (!m) return null;
  const rawOp = m[3].toLowerCase();
  const op = aliases[rawOp] || rawOp;
  return {
    op,
    value: m[4] || "",
    negate: !!m[2],
    start: m.index + m[1].length,
  };
}

function trailingFreeToken(raw: string): { before: string; token: string } | null {
  const s = String(raw || "").replace(/\s+$/u, "");
  if (!s) return null;
  const m = /^(.*?)(\S+)$/u.exec(s);
  if (!m) return null;
  const token = m[2];
  if (/^-?[a-z][a-z0-9]*:/iu.test(token)) return null;
  return { before: m[1].replace(/\s+$/u, ""), token };
}

function quoteIfNeeded(token: string): string {
  if (/[\s:]/u.test(token) || /["']/u.test(token)) {
    return `"${token.replace(/"/gu, "")}"`;
  }
  return token;
}

/**
 * Apply a suggestion.
 * - value rows replace the trailing `op:` value
 * - bare `op:` with free text ahead folds into `op:text`
 * - otherwise append
 */
export function applyQuerySearchSuggestion(
  raw: string,
  row: Pick<QuerySearchSuggestion, "kind" | "value" | "insert">,
  trailing: {
    op: string;
    value: string;
    negate: boolean;
    start: number;
  } | null,
): string {
  if (row.kind === "value" && trailing && row.value != null) {
    const before = raw.slice(0, trailing.start);
    const neg = trailing.negate ? "-" : "";
    return `${before}${neg}${trailing.op}:${row.value} `.replace(/\s+/gu, " ");
  }
  if (row.insert == null) return raw;

  const insert = String(row.insert);
  const insertTrim = insert.replace(/\s+$/u, "");
  const free = trailingFreeToken(raw);

  const bareOp = /^([a-z][a-z0-9]*):$/iu.exec(insertTrim);
  if (bareOp && free) {
    const op = `${bareOp[1].toLowerCase()}:`;
    const body = `${free.before ? `${free.before} ` : ""}${op}${quoteIfNeeded(free.token)} `;
    return body.replace(/\s+/gu, " ");
  }

  if (free && /^[a-z][a-z0-9]*:.+/iu.test(insertTrim)) {
    return `${free.before ? `${free.before} ` : ""}${insertTrim} `.replace(/\s+/gu, " ");
  }

  const trimmed = raw.replace(/\s+$/u, "");
  const needsSpace = !!(trimmed && !/:$/u.test(trimmed));
  return trimmed + (needsSpace ? " " : "") + insert;
}

export function emptyQuerySearchMenu(): QuerySearchMenu {
  return { sections: [], flat: [] };
}

export function pushQuerySearchSection(
  menu: QuerySearchMenu,
  title: string,
  rows: QuerySearchSuggestion[],
): void {
  if (!rows.length) return;
  const section: QuerySearchSection = { title, rows };
  menu.sections.push(section);
  for (const row of rows) {
    menu.flat.push(row);
  }
}
