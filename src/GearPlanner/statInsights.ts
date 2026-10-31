/**
 * Waste / falloff insights for Gear Planner Stat Detail.
 *
 * Hit mitigation: calculations.ts (2× pierce, damage_multiplier clamp).
 * Status resists: adventureland_mongodb node/server_functions.js add_condition
 * + design/conditions.js `defense` fields.
 *
 * TODO: evasion / reflection / fortitude graphs
 */

import { DamageType, damageMultiplier, effectiveDefense } from "./calculations";

export type StatusResistStat =
  | "pnresistance"
  | "firesistance"
  | "fzresistance"
  | "phresistance"
  | "stresistance";

export const STATUS_RESIST_STATS: readonly StatusResistStat[] = [
  "pnresistance",
  "firesistance",
  "fzresistance",
  "phresistance",
  "stresistance",
];

export type InsightStat =
  | "apiercing"
  | "rpiercing"
  | "armor"
  | "resistance"
  | "str"
  | "int"
  | "evasion"
  | "reflection"
  | "for"
  | StatusResistStat
  | "effectiveDefense"
  | "damageMultiplier"
  | "expectedHit"
  | "crit"
  | "critdamage"
  | "attack"
  | "frequency";

export type CurvePoint = { x: number; y: number };

export type ConditionDefenseDef = {
  name?: string;
  defense?: string;
  debuff?: boolean;
  explanation?: string;
};

/** Hint shown in Stat Detail / waste chips, with a click target stat. */
export type WasteHint = {
  text: string;
  openStat: InsightStat;
};

export type PierceWaste = {
  damageType: DamageType;
  activePierceStat: "apiercing" | "rpiercing" | "none";
  unusedPierceStat: "apiercing" | "rpiercing" | null;
  unusedPierce: number;
  activePierce: number;
  defense: number;
  effectiveDefense: number;
  multiplier: number;
  /** Min pierce where multiplier hits the 1.32 hard cap (null if pure). */
  pierceAtHardCap: number | null;
  /** Extra active pierce beyond hard cap (0 if not at/over). */
  piercePastHardCap: number;
  /** Mult gain from +1 active pierce at current value. */
  marginalMultFromPlusOne: number;
  hints: WasteHint[];
};

export type StatusResistInsight = {
  stat: StatusResistStat;
  value: number;
  /** Chance to fully block conditions that use this as `defense` (clamped 0–100). */
  chanceResistPercent: number;
  /** Duration remaining fraction for type-specific duration scales (poison/burn/st). */
  durationRemainingFraction: number;
  overcap: boolean;
  chanceConditions: { key: string; name: string }[];
  notes: string[];
  hints: string[];
};

const HARD_CAP = 1.32;

/** Smallest pierce such that damageMultiplier(defense - 2*pierce) === 1.32. */
export function pierceToHardCap(defense: number): number {
  if (damageMultiplier(defense) >= HARD_CAP - 1e-12) return 0;
  let lo = 0;
  let hi = 1;
  while (damageMultiplier(effectiveDefense(defense, hi)) < HARD_CAP - 1e-12 && hi < 100_000) {
    hi *= 2;
  }
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (damageMultiplier(effectiveDefense(defense, mid)) >= HARD_CAP - 1e-12) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

export function pierceWaste(args: {
  damageType: DamageType | string | undefined;
  apiercing?: number;
  rpiercing?: number;
  monsterArmor?: number;
  monsterResistance?: number;
  /** Skill pierce on info only — reduces effective defense once (basic path). */
  skillPierce?: number;
}): PierceWaste {
  const raw = args.damageType;
  const damageType: DamageType =
    raw === "magical" || raw === "pure" || raw === "physical" ? raw : "physical";
  const ap = args.apiercing ?? 0;
  const rp = args.rpiercing ?? 0;
  const hints: WasteHint[] = [];

  if (damageType === "pure") {
    if (ap > 0 || rp > 0) {
      hints.push({
        text: "Pure damage ignores armor, resistance, and both pierces.",
        openStat: "damageMultiplier",
      });
    }
    return {
      damageType,
      activePierceStat: "none",
      unusedPierceStat: null,
      unusedPierce: ap + rp,
      activePierce: 0,
      defense: 0,
      effectiveDefense: 0,
      multiplier: 1,
      pierceAtHardCap: null,
      piercePastHardCap: 0,
      marginalMultFromPlusOne: 0,
      hints,
    };
  }

  const activePierceStat = damageType === "magical" ? "rpiercing" : "apiercing";
  const unusedPierceStat = damageType === "magical" ? "apiercing" : "rpiercing";
  const activePierce = damageType === "magical" ? rp : ap;
  const unusedPierce = damageType === "magical" ? ap : rp;
  const defense = damageType === "magical" ? args.monsterResistance ?? 0 : args.monsterArmor ?? 0;
  const skillPierce = Math.max(0, args.skillPierce ?? 0);
  const eff = effectiveDefense(defense, activePierce) - skillPierce;
  const mult = damageMultiplier(eff);
  const pierceAtHardCap = pierceToHardCap(defense - skillPierce);
  const piercePastHardCap = Math.max(0, activePierce - pierceAtHardCap);
  const multPlus = damageMultiplier(effectiveDefense(defense, activePierce + 1) - skillPierce);
  const marginalMultFromPlusOne = multPlus - mult;

  if (unusedPierce > 0) {
    hints.push({
      text: `${unusedPierceStat} ${unusedPierce} is unused vs this target (${damageType} hits use ${activePierceStat}).`,
      openStat: unusedPierceStat,
    });
  }
  if (piercePastHardCap > 0) {
    hints.push({
      text: `${activePierceStat} is past the m = 132% hard cap — drop ~${piercePastHardCap.toFixed(
        0,
      )} p (does nothing vs this D).`,
      openStat: activePierceStat,
    });
  } else if (marginalMultFromPlusOne < 1e-6 && activePierce > 0) {
    hints.push({
      text: `+1 p (${activePierceStat}) adds no m at this point.`,
      openStat: activePierceStat,
    });
  } else if (eff < 0 && marginalMultFromPlusOne < 0.001) {
    hints.push({
      text: `Overpiercing: returns are soft (marginal +${(marginalMultFromPlusOne * 100).toFixed(
        3,
      )}% m per p).`,
      openStat: activePierceStat,
    });
  }

  return {
    damageType,
    activePierceStat,
    unusedPierceStat,
    unusedPierce,
    activePierce,
    defense,
    effectiveDefense: eff,
    multiplier: mult,
    pierceAtHardCap,
    piercePastHardCap,
    marginalMultFromPlusOne,
    hints,
  };
}

/** Sample damage multiplier % vs pierce for a fixed monster defense. */
export function mitigationCurveByPierce(args: {
  defense: number;
  pierceFrom?: number;
  pierceTo?: number;
  steps?: number;
  skillPierce?: number;
}): CurvePoint[] {
  const from = args.pierceFrom ?? 0;
  const to = Math.max(from + 1, args.pierceTo ?? Math.max(pierceToHardCap(args.defense) + 20, 200));
  const steps = args.steps ?? 80;
  const skillPierce = Math.max(0, args.skillPierce ?? 0);
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const pierce = from + ((to - from) * i) / steps;
    const mult = damageMultiplier(effectiveDefense(args.defense, pierce) - skillPierce);
    points.push({ x: pierce, y: mult * 100 });
  }
  return points;
}

/** Sample damage multiplier % vs effective defense (x may be negative). */
export function mitigationCurveByEffectiveDefense(args: {
  from?: number;
  to?: number;
  steps?: number;
}): CurvePoint[] {
  const from = args.from ?? -200;
  const to = args.to ?? 800;
  const steps = args.steps ?? 100;
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const eff = from + ((to - from) * i) / steps;
    points.push({ x: eff, y: damageMultiplier(eff) * 100 });
  }
  return points;
}

function conditionsUsingDefense(
  conditions: Record<string, ConditionDefenseDef | undefined> | undefined,
  stat: StatusResistStat,
): { key: string; name: string }[] {
  if (!conditions) return [];
  const out: { key: string; name: string }[] = [];
  for (const [key, def] of Object.entries(conditions)) {
    if (def?.defense === stat) {
      out.push({ key, name: def.name ?? key });
    }
  }
  return out;
}

export function statusResistInsight(
  stat: StatusResistStat,
  value: number,
  conditions?: Record<string, ConditionDefenseDef | undefined>,
): StatusResistInsight {
  const chanceConditions = conditionsUsingDefense(conditions, stat);
  const chanceResistPercent = Math.max(0, Math.min(100, value));
  // Exactly 100 is at-cap (roll/duration already maxed); only >100 is wasted overcap.
  const overcap = value > 100;
  const durationRemainingFraction = Math.max(0, (100 - value) / 100);
  const notes: string[] = [];
  const hints: string[] = [];

  if (stat === "pnresistance") {
    notes.push("Chance resist for conditions with defense: pnresistance (e.g. poisoned).");
    notes.push("Also shortens poison duration by (100 − pnresistance) / 100.");
  } else if (stat === "firesistance") {
    notes.push("Chance resist for burned.");
    notes.push("Also scales burn intensity/duration by (1 − firesistance / 100).");
  } else if (stat === "fzresistance") {
    notes.push("Chance resist for frozen / deepfreezed.");
  } else if (stat === "phresistance") {
    notes.push("Chance resist for stunned (impact).");
  } else if (stat === "stresistance") {
    notes.push("Shortens duration of every debuff condition by (100 − stresistance) / 100.");
    notes.push("Does not grant a chance resist by itself.");
  }

  if (stat !== "stresistance" && chanceConditions.length > 0) {
    notes.push(
      `Chance roll: random < ${stat} / 100 against: ${chanceConditions
        .map((c) => c.name)
        .join(", ")}.`,
    );
  }

  if (overcap) {
    hints.push(
      `${stat} > 100 — chance resist is capped at 100%; extra points do nothing for the roll${
        stat === "stresistance" || stat === "pnresistance" || stat === "firesistance"
          ? ", and duration/intensity scale is already ≤ 0."
          : "."
      }`,
    );
  }

  return {
    stat,
    value,
    chanceResistPercent,
    durationRemainingFraction,
    overcap,
    chanceConditions,
    notes,
    hints,
  };
}

/** Chance-resist % curve (y) vs resist value (x), capped at 100. */
export function statusChanceCurve(from = 0, to = 150, steps = 60): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    points.push({ x, y: Math.max(0, Math.min(100, x)) });
  }
  return points;
}

/** Duration remaining % curve vs resist value. */
export function statusDurationCurve(from = 0, to = 150, steps = 60): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    points.push({ x, y: Math.max(0, (100 - x) / 100) * 100 });
  }
  return points;
}

export function isStatusResistStat(stat: string): stat is StatusResistStat {
  return (STATUS_RESIST_STATS as readonly string[]).includes(stat);
}

export function isInsightStat(stat: string): stat is InsightStat {
  return (
    stat === "apiercing" ||
    stat === "rpiercing" ||
    stat === "armor" ||
    stat === "resistance" ||
    stat === "str" ||
    stat === "int" ||
    stat === "evasion" ||
    stat === "reflection" ||
    stat === "for" ||
    stat === "effectiveDefense" ||
    stat === "damageMultiplier" ||
    stat === "expectedHit" ||
    stat === "crit" ||
    stat === "critdamage" ||
    stat === "attack" ||
    stat === "frequency" ||
    isStatusResistStat(stat)
  );
}

/** Stats that are derived fight metrics (no gear contribution table). */
export function isDerivedInsightStat(stat: string): boolean {
  return (
    stat === "effectiveDefense" ||
    stat === "damageMultiplier" ||
    stat === "expectedHit" ||
    stat === "crit" ||
    stat === "critdamage" ||
    stat === "attack" ||
    stat === "frequency"
  );
}

/** Ability id → condition key when the ability name is the apply hook. */
const ABILITY_CONDITION_ALIASES: Record<string, string> = {
  burn: "burned",
  multi_burn: "burned",
  deepfreeze: "deepfreezed",
  multi_freeze: "frozen",
  stone: "stunned",
};

export type MonsterAbilityDef = {
  condition?: string;
  aura?: boolean;
};

export type MonsterStatusSource = {
  poisonous?: boolean;
  abilities?: Record<string, MonsterAbilityDef | undefined>;
};

export type MonsterConditionThreat = {
  conditionKey: string;
  name: string;
  /** Typed resist that chance-blocks this condition, if any. */
  defenseStat: StatusResistStat | null;
  /** Why we think this monster applies it. */
  source: string;
  debuff: boolean;
};

/**
 * Conditions this monster is likely to apply (poisonous flag + ability hooks).
 * Used so status-resist modals answer "does this matter vs my target?".
 */
export function monsterConditionThreats(
  monster: MonsterStatusSource | undefined,
  conditions?: Record<string, ConditionDefenseDef | undefined>,
): MonsterConditionThreat[] {
  if (!monster) return [];
  const byKey = new Map<string, MonsterConditionThreat>();

  const add = (conditionKey: string, source: string) => {
    if (byKey.has(conditionKey)) return;
    const def = conditions?.[conditionKey];
    const defenseRaw = def?.defense;
    const defenseStat = defenseRaw && isStatusResistStat(defenseRaw) ? defenseRaw : null;
    byKey.set(conditionKey, {
      conditionKey,
      name: def?.name ?? conditionKey,
      defenseStat,
      source,
      debuff: Boolean(def?.debuff),
    });
  };

  if (monster.poisonous) add("poisoned", "poisonous");

  if (monster.abilities) {
    for (const [abilityId, ability] of Object.entries(monster.abilities)) {
      if (ability?.condition) add(ability.condition, abilityId);
      const alias = ABILITY_CONDITION_ALIASES[abilityId];
      if (alias) add(alias, abilityId);
    }
  }

  return [...byKey.values()];
}

/** Land chance % (y) vs evasion/reflection % (x). Server gates at random*100 < chance. */
export function landChanceCurve(from = 0, to = 100, steps = 50): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    const miss = Math.max(0, Math.min(100, x));
    points.push({ x, y: 100 - miss });
  }
  return points;
}

/** Fortitude damage mult % (y) vs defender `for` (x). Live: damage_multiplier(for × 5). */
export function fortitudeMultCurve(from = 0, to = 80, steps = 80): CurvePoint[] {
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    points.push({ x, y: damageMultiplier(x * 5) * 100 });
  }
  return points;
}

/** Armor from STR (server softcap at 160). */
export function armorFromStr(str: number): number {
  return Math.min(str, 160) + Math.max(0, str - 160) * 0.25;
}

/** Resistance from INT (server softcap at 180). */
export function resistanceFromInt(int: number): number {
  return Math.min(int, 180) + Math.max(0, int - 180) * 0.25;
}

/** Attribute → derived defense softcap curve (y = derived points). */
export function attributeSoftcapCurve(args: {
  kind: "str" | "int";
  from?: number;
  to?: number;
  steps?: number;
}): CurvePoint[] {
  const from = args.from ?? 0;
  const to = args.to ?? 300;
  const steps = args.steps ?? 60;
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const x = from + ((to - from) * i) / steps;
    const y = args.kind === "str" ? armorFromStr(x) : resistanceFromInt(x);
    points.push({ x, y });
  }
  return points;
}

export type WasteChip = WasteHint;

/** Short chips for the vs-monster panel (label + Stat Detail open target). */
export function wasteChipsForLoadout(args: {
  damageType: DamageType | string | undefined;
  apiercing?: number;
  rpiercing?: number;
  monsterArmor?: number;
  monsterResistance?: number;
  statusResists?: Partial<Record<StatusResistStat, number>>;
  skillPierce?: number;
}): WasteChip[] {
  const chips: WasteChip[] = [];
  const pierce = pierceWaste(args);
  for (const h of pierce.hints) chips.push(h);
  if (args.statusResists) {
    for (const stat of STATUS_RESIST_STATS) {
      const v = args.statusResists[stat];
      if (v == null || v <= 100) continue;
      chips.push({
        text: `${stat} > 100 (overcap)`,
        openStat: stat,
      });
    }
  }
  return chips;
}
