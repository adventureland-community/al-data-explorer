import { attrLabel } from "./attr";
import { pushQuerySearchSection } from "./applySuggestion";
import type { QuerySearchMenu, SurfaceOpDef } from "./types";

export const ITEM_SEARCH_FLAG_SUGGESTIONS: readonly { value: string; hint: string }[] = [
  { value: "upgrade", hint: "Upgradeable" },
  { value: "compound", hint: "Compoundable" },
  { value: "craft", hint: "Craftable" },
  { value: "exchange", hint: "Exchangeable" },
  { value: "event", hint: "Event" },
  { value: "legacy", hint: "Legacy" },
];

export function freeTokenNeedle(raw: string): string {
  return raw.trim().split(/\s+/u).pop()?.toLowerCase() ?? "";
}

export function pushOperatorSuggestions(
  menu: QuerySearchMenu,
  ops: readonly SurfaceOpDef[],
  freeNeedle: string,
): void {
  const needle = freeNeedle.toLowerCase();
  const rows = [];
  for (const op of ops) {
    const label = `${op.name}:`;
    if (needle && !label.startsWith(needle) && !op.insert.toLowerCase().startsWith(needle)) {
      continue;
    }
    rows.push({
      kind: "op" as const,
      label,
      hint: op.hint,
      insert: op.insert,
    });
  }
  pushQuerySearchSection(menu, "Operators", rows);
}

function attrKeyMatchesNeedle(key: string, needle: string): boolean {
  if (!needle) return true;
  const label = attrLabel(key).toLowerCase();
  const compactLabel = label.replace(/[.\s]+/gu, "");
  const compactNeedle = needle.replace(/[.\s]+/gu, "");
  return (
    key.startsWith(needle) ||
    label.includes(needle) ||
    (compactNeedle.length > 0 && compactLabel.includes(compactNeedle))
  );
}

/** `attr:` value completions — insert `key>=`. */
export function pushAttrKeySuggestions(
  menu: QuerySearchMenu,
  keys: readonly string[],
  needle: string,
  title = "Attributes",
): void {
  const keyNeedle = needle.replace(/[<>]=?.*$/u, "").toLowerCase();
  const rows = [];
  for (const k of keys) {
    if (!attrKeyMatchesNeedle(k, keyNeedle)) continue;
    rows.push({
      kind: "value" as const,
      label: `${k}>=`,
      hint: attrLabel(k),
      value: `${k}>=`,
    });
  }
  pushQuerySearchSection(menu, title, rows);
}

/**
 * Free-text attribute helper — insert bare keys that match name/key/label search.
 * Caps rows so the menu stays usable next to operators.
 */
export function pushFreeTextAttrSuggestions(
  menu: QuerySearchMenu,
  keys: readonly string[],
  freeNeedle: string,
  limit = 16,
): void {
  const needle = freeNeedle.toLowerCase();
  if (needle.length < 2) return;
  const rows = [];
  for (const k of keys) {
    if (!attrKeyMatchesNeedle(k, needle)) continue;
    rows.push({
      kind: "op" as const,
      label: k,
      hint: attrLabel(k),
      insert: `${k} `,
    });
    if (rows.length >= limit) break;
  }
  pushQuerySearchSection(menu, "Attributes", rows);
}

export function pushFlagValueSuggestions(
  menu: QuerySearchMenu,
  flags: readonly { value: string; hint: string }[],
  needle: string,
): void {
  const rows = [];
  for (const f of flags) {
    if (needle && !f.value.startsWith(needle)) continue;
    rows.push({
      kind: "value" as const,
      label: f.value,
      hint: f.hint,
      value: f.value,
    });
  }
  pushQuerySearchSection(menu, "Flags", rows);
}
