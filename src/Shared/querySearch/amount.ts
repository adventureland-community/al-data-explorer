import type { NumericCompareOp, ParsedAmount } from "./types";

/** Parse `>=10`, `1m`, `500k`, bare `42` into a compare amount. */
export function parseAmount(raw: string): ParsedAmount | null {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/,/gu, "");
  const m = /^([<>]=?|=)?\s*(\d+(?:\.\d+)?)\s*([kmb])?$/u.exec(s);
  if (!m) return null;
  let n = parseFloat(m[2]);
  if (!Number.isFinite(n)) return null;
  const u = m[3];
  if (u === "k") n *= 1e3;
  else if (u === "m") n *= 1e6;
  else if (u === "b") n *= 1e9;
  const op = (m[1] || "=") as NumericCompareOp;
  return { op, n };
}

export function compareAmount(actual: number, amt: ParsedAmount): boolean {
  const n = Number(actual) || 0;
  switch (amt.op) {
    case ">=":
      return n >= amt.n;
    case ">":
      return n > amt.n;
    case "<=":
      return n <= amt.n;
    case "<":
      return n < amt.n;
    case "=":
      return n === amt.n;
    default: {
      const _exhaustive: never = amt.op;
      return _exhaustive;
    }
  }
}

export function compareNumber(actual: number, op: NumericCompareOp, expected: number): boolean {
  return compareAmount(actual, { op, n: expected });
}
