import { STAT_DISPLAY_LABELS } from "../../gameData/statLabels";
import { parseAmount, compareAmount } from "./amount";
import type { AttrSpec } from "./types";

/** Item combat/stat keys usable in `attr:`. */
export const ITEM_ATTR_KEYS: readonly string[] = [
  "str",
  "int",
  "dex",
  "vit",
  "for",
  "hp",
  "mp",
  "armor",
  "resistance",
  "attack",
  "range",
  "speed",
  "evasion",
  "reflection",
  "lifesteal",
  "manasteal",
  "crit",
  "critdamage",
  "rpiercing",
  "apiercing",
  "dreturn",
  "frequency",
  "gold",
  "luck",
  "xp",
  "output",
  "stat",
  "courage",
  "mcourage",
  "pcourage",
  "explosion",
  "blast",
  "mp_cost",
  "mp_reduction",
];

/** Monster numeric fields for `hp:` / `attr:` on the monsters page. */
export const MONSTER_NUMERIC_KEYS: readonly string[] = [
  "hp",
  "mp",
  "xp",
  "attack",
  "frequency",
  "armor",
  "resistance",
  "range",
  "speed",
  "respawn",
  "evasion",
  "reflection",
  "dreturn",
  "lifesteal",
  "manasteal",
  "rpiercing",
  "apiercing",
  "crit",
  "critdamage",
];

export function attrLabel(key: string): string {
  return STAT_DISPLAY_LABELS[key] ?? key;
}

/**
 * Parse `attr:` RHS: `str`, `armor>=50`, `crit>5,luck` (OR within one clause).
 */
export function parseAttrSpecs(raw: string): AttrSpec[] {
  const specs: AttrSpec[] = [];
  const parts = String(raw || "")
    .split(/[|,]/u)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const part of parts) {
    const am = /^([a-z_][a-z0-9_]*)\s*([<>]=?|=)?\s*(.*)$/iu.exec(part);
    if (!am) continue;
    const key = am[1].toLowerCase();
    const opSign = am[2] || "";
    const rhs = String(am[3] || "").trim();
    if (!opSign && !rhs) {
      specs.push({ kind: "any", key });
      continue;
    }
    const amt = parseAmount((opSign || "=") + rhs);
    if (amt) specs.push({ kind: "cmp", key, op: amt.op, n: amt.n });
    else specs.push({ kind: "any", key });
  }

  return specs;
}

export function serializeAttrSpecs(specs: AttrSpec[]): string {
  return specs
    .map((spec) => {
      if (spec.kind === "any") return spec.key;
      const op = spec.op === "=" ? "" : spec.op;
      return `${spec.key}${op}${spec.n}`;
    })
    .join(",");
}

/** True if any spec matches the resolved stats map. */
export function statsMatchAttrSpecs(
  stats: Record<string, number | undefined> | null | undefined,
  specs: AttrSpec[],
): boolean {
  if (!specs.length) return true;
  const prop = stats ?? {};
  for (const spec of specs) {
    const n = Number(prop[spec.key]) || 0;
    if (spec.kind === "any") {
      if (n > 0) return true;
      continue;
    }
    if (compareAmount(n, { op: spec.op, n: spec.n })) return true;
  }
  return false;
}
