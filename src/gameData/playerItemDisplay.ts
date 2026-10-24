import { GItem } from "typed-adventureland";

import { buildLevelStats, LevelStats } from "./compareStats";
import { formatItemStatValue } from "./prettyNumbers";
import { STAT_DISPLAY_LABELS } from "./statLabels";

export { abilityBlurb, getItemEffects } from "./itemEffects";
export type { EffectLookups, ItemEffectView } from "./itemEffects";

/**
 * Numeric fields copied onto level stats that are catalog/meta, not combat lines.
 * Unknown numeric keys are shown; only this denylist is skipped.
 */
const HIDDEN_PLAYER_STAT_KEYS = new Set([
  "level",
  "attr0",
  "attr1",
  "set",
  "class",
  "s",
  "e",
  "a",
  "g",
  "tier",
  "grade",
  "edge",
  "offering",
  "markup",
  "charge",
  "duration",
  "cooldown",
  "cash",
  "days",
  "multiplier",
  "version",
  "gold_reward",
]);

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

/** Percent / signed formats shared with item tooltips. */
function itemStatFormat(key: string) {
  return (value: number | string) => formatItemStatValue(key, Number(value));
}

/**
 * Combat / gear numeric lines only (mirrors adventureland render_item + tooltip stats).
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
  { key: "pnresistance", label: L("pnresistance", "Poison Res.") },
  { key: "firesistance", label: L("firesistance", "Fire Res.") },
  { key: "fzresistance", label: L("fzresistance", "Freeze Res.") },
  { key: "phresistance", label: L("phresistance", "Impact Res.") },
  { key: "stresistance", label: L("stresistance", "Status Res.") },
  {
    key: "speed",
    label: L("speed", "Speed"),
    format: (v) => (Number(v) > 0 ? `+${v}` : String(v)),
  },
  { key: "frequency", label: L("frequency", "A.Speed") },
  { key: "crit", label: L("crit", "Crit"), format: itemStatFormat("crit") },
  {
    key: "critdamage",
    label: L("critdamage", "Crit Damage"),
    format: itemStatFormat("critdamage"),
  },
  { key: "evasion", label: L("evasion", "Evasion"), format: itemStatFormat("evasion") },
  { key: "avoidance", label: L("avoidance", "Avoidance"), format: itemStatFormat("avoidance") },
  { key: "miss", label: L("miss", "Miss"), format: itemStatFormat("miss") },
  { key: "reflection", label: L("reflection", "Reflection"), format: itemStatFormat("reflection") },
  { key: "dreturn", label: L("dreturn", "D.Return"), format: itemStatFormat("dreturn") },
  { key: "lifesteal", label: L("lifesteal", "Lifesteal"), format: itemStatFormat("lifesteal") },
  { key: "manasteal", label: L("manasteal", "Manasteal"), format: itemStatFormat("manasteal") },
  { key: "luck", label: L("luck", "Luck"), format: itemStatFormat("luck") },
  { key: "gold", label: L("gold", "Gold"), format: itemStatFormat("gold") },
  { key: "xp", label: L("xp", "XP"), format: itemStatFormat("xp") },
  {
    key: "output",
    label: L("output", "Damage Output"),
    format: (v) => `${Number(v) > 0 ? "+" : ""}${v}%`,
  },
  { key: "incdmgamp", label: L("incdmgamp", "Incoming Damage"), format: (v) => `${v}%` },
  { key: "stun", label: L("stun", "Stun"), format: (v) => `${v}%` },
  { key: "explosion", label: L("explosion", "Explosion"), format: (v) => `${v}%` },
  { key: "blast", label: L("blast", "Blast"), format: (v) => `${v}%` },
  { key: "breaks", label: L("breaks", "Breaks"), format: itemStatFormat("breaks") },
  { key: "courage", label: L("courage", "Courage") },
  { key: "mcourage", label: L("mcourage", "M.Courage") },
  { key: "pcourage", label: L("pcourage", "P.Courage") },
  { key: "charisma", label: L("charisma", "Charisma") },
  { key: "awesomeness", label: L("awesomeness", "Awesomeness") },
  { key: "bling", label: L("bling", "Bling") },
  { key: "cuteness", label: L("cuteness", "Cuteness") },
];
export type PlayerStatRow = {
  key: string;
  label: string;
  value: string;
};

function isShownNumericStat(raw: unknown): raw is number {
  return typeof raw === "number" && raw !== 0 && Number.isFinite(raw);
}

function labelForStatKey(key: string): string {
  return STAT_DISPLAY_LABELS[key] ?? key;
}

/** Combat stat rows only — no grade/tier/effects. */
export function buildPlayerStatRows(gItem: GItem, level: number): PlayerStatRow[] {
  const stats = buildLevelStats(gItem, level) as Record<string, number | string | undefined>;
  const rows: PlayerStatRow[] = [];
  const seen = new Set<string>();

  for (const line of PLAYER_STAT_LINES) {
    if (line.key === "damage_type") {
      const { damage_type: dt } = gItem as { damage_type?: string };
      const label = damageTypeLabel(dt);
      if (label) {
        rows.push({ key: "damage_type", label: line.label, value: label });
        seen.add("damage_type");
      }
      continue;
    }

    const raw = stats[line.key];
    if (raw == null || raw === 0 || raw === "") continue;
    const value = line.format ? line.format(raw, gItem, stats as LevelStats) : String(raw);
    rows.push({ key: line.key, label: line.label, value });
    seen.add(line.key);
  }

  // New / unlabeled numeric attrs still show (raw key until labeled).
  const extras = Object.keys(stats)
    .filter((key) => !seen.has(key) && !HIDDEN_PLAYER_STAT_KEYS.has(key))
    .filter((key) => isShownNumericStat(stats[key]))
    .sort((a, b) => a.localeCompare(b));

  for (const key of extras) {
    const raw = stats[key] as number;
    rows.push({
      key,
      label: labelForStatKey(key),
      value: formatItemStatValue(key, raw),
    });
  }

  return rows;
}
