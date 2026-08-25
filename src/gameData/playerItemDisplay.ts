import { GItem } from "typed-adventureland";

import { buildLevelStats, LevelStats } from "./compareStats";
import { STAT_DISPLAY_LABELS } from "./statLabels";

export { abilityBlurb, getItemEffects } from "./itemEffects";
export type { EffectLookups, ItemEffectView } from "./itemEffects";

/** Grade thresholds: High / Rare / Legendary / Exalted — mirrors calculate_item_grade. */
export function getItemGrade(gItem: GItem, level: number): number {
  if (!(gItem.upgrade || gItem.compound)) return 0;
  const grades = (gItem.grades as number[] | undefined) ?? [9, 10, 11, 12];
  if (level >= (grades[3] ?? 12)) return 4;
  if (level >= (grades[2] ?? 11)) return 3;
  if (level >= (grades[1] ?? 10)) return 2;
  if (level >= (grades[0] ?? 9)) return 1;
  return 0;
}

export function gradeLabel(grade: number): string | null {
  switch (grade) {
    case 1:
      return "High";
    case 2:
      return "Rare";
    case 3:
      return "Legendary";
    case 4:
      return "Exalted";
    default:
      return null;
  }
}

export function damageTypeLabel(damageType: string | undefined): string | null {
  if (!damageType) return null;
  switch (damageType) {
    case "pure":
      return "Pure";
    case "magical":
      return "Magical";
    case "physical":
      return "Physical";
    default:
      return damageType;
  }
}

type StatLineDef = {
  key: string;
  label: string;
  format?: (value: number | string, gItem: GItem, stats: LevelStats) => string;
};

function L(key: string, fallback: string): string {
  return STAT_DISPLAY_LABELS[key] ?? fallback;
}

/**
 * Combat / gear numeric lines only (mirrors adventureland render_item order).
 * Grade, tier, and ability/aura/use come from getItemGrade / getItemFacts / getItemEffects.
 */
const PLAYER_STAT_LINES: StatLineDef[] = [
  { key: "attack", label: L("attack", "Damage") },
  { key: "damage_type", label: "Type" },
  { key: "range", label: L("range", "Range"), format: (v) => `+${v}` },
  { key: "hp", label: L("hp", "HP") },
  { key: "str", label: L("str", "Strength") },
  { key: "int", label: L("int", "Intelligence") },
  { key: "dex", label: L("dex", "Dexterity") },
  { key: "vit", label: L("vit", "Vitality") },
  { key: "for", label: L("for", "Fortitude") },
  { key: "mp", label: L("mp", "MP") },
  {
    key: "mp_cost",
    label: L("mp_cost", "Attack MP Cost"),
    format: (v) => (Number(v) > 0 ? `+${v}` : String(v)),
  },
  {
    key: "mp_reduction",
    label: L("mp_reduction", "Skill MP Reduction"),
    format: (v) => `%${v}`,
  },
  { key: "stat", label: L("stat", "Stat") },
  { key: "armor", label: L("armor", "Armor") },
  { key: "apiercing", label: L("apiercing", "A.Piercing") },
  { key: "rpiercing", label: L("rpiercing", "R.Piercing") },
  { key: "resistance", label: L("resistance", "Resistance") },
  {
    key: "speed",
    label: L("speed", "Speed"),
    format: (v) => (Number(v) > 0 ? `+${v}` : String(v)),
  },
  { key: "frequency", label: L("frequency", "A.Speed") },
  { key: "crit", label: L("crit", "Crit"), format: (v) => `${v}%` },
  { key: "critdamage", label: L("critdamage", "Crit Damage"), format: (v) => `+${v}%` },
  { key: "evasion", label: L("evasion", "Evasion"), format: (v) => `${v}%` },
  { key: "reflection", label: L("reflection", "Reflection"), format: (v) => `${v}%` },
  { key: "lifesteal", label: L("lifesteal", "Lifesteal"), format: (v) => `${v}%` },
  { key: "manasteal", label: L("manasteal", "Manasteal"), format: (v) => `${v}%` },
  { key: "luck", label: L("luck", "Luck"), format: (v) => `${v}%` },
  { key: "gold", label: L("gold", "Gold"), format: (v) => `${v}%` },
  { key: "courage", label: L("courage", "Courage") },
  { key: "mcourage", label: L("mcourage", "M.Courage") },
  { key: "pcourage", label: L("pcourage", "P.Courage") },
];

export type PlayerStatRow = {
  key: string;
  label: string;
  value: string;
};

/** Combat stat rows only — no grade/tier/effects. */
export function buildPlayerStatRows(gItem: GItem, level: number): PlayerStatRow[] {
  const stats = buildLevelStats(gItem, level);
  const rows: PlayerStatRow[] = [];

  for (const line of PLAYER_STAT_LINES) {
    if (line.key === "damage_type") {
      const { damage_type: dt } = gItem as { damage_type?: string };
      const label = damageTypeLabel(dt);
      if (label) rows.push({ key: "damage_type", label: line.label, value: label });
      continue;
    }

    const raw = (stats as Record<string, number | string | undefined>)[line.key];
    if (raw == null || raw === 0 || raw === "") continue;
    const value = line.format ? line.format(raw, gItem, stats) : String(raw);
    rows.push({ key: String(line.key), label: line.label, value });
  }

  return rows;
}
