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

export function pushAttrKeySuggestions(
  menu: QuerySearchMenu,
  keys: readonly string[],
  needle: string,
  title = "Attributes",
): void {
  const keyNeedle = needle.replace(/[<>]=?.*$/u, "");
  const rows = [];
  for (const k of keys) {
    if (keyNeedle && !k.startsWith(keyNeedle)) continue;
    rows.push({
      kind: "value" as const,
      label: `${k}>=`,
      hint: `attr:${k}>=…`,
      value: `${k}>=`,
    });
  }
  pushQuerySearchSection(menu, title, rows);
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
