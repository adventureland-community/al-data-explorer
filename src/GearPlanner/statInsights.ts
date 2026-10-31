/**
 * Waste / falloff insights for Gear Planner Stat Detail.
 *
 * Hit mitigation: calculations.ts (2× pierce, damage_multiplier clamp).
 * Status resists: adventureland_mongodb node/server_functions.js add_condition
 * + design/conditions.js `defense` fields.
 *
 * TODO: evasion / reflection / fortitude graphs
 * TODO: skill pierce on the curve
 * TODO: STR/INT softcap waste graphs (armor/resist from attributes)
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
  | StatusResistStat
  | "effectiveDefense"
  | "damageMultiplier";

export type CurvePoint = { x: number; y: number };

export type ConditionDefenseDef = {
  name?: string;
  defense?: string;
  debuff?: boolean;
  explanation?: string;
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
  hints: string[];
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
}): PierceWaste {
  const raw = args.damageType;
  const damageType: DamageType =
    raw === "magical" || raw === "pure" || raw === "physical" ? raw : "physical";
  const ap = args.apiercing ?? 0;
  const rp = args.rpiercing ?? 0;
  const hints: string[] = [];

  if (damageType === "pure") {
    if (ap > 0 || rp > 0) {
      hints.push("Pure damage ignores armor, resistance, and both pierces.");
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
  const eff = effectiveDefense(defense, activePierce);
  const mult = damageMultiplier(eff);
  const pierceAtHardCap = pierceToHardCap(defense);
  const piercePastHardCap = Math.max(0, activePierce - pierceAtHardCap);
  const multPlus = damageMultiplier(effectiveDefense(defense, activePierce + 1));
  const marginalMultFromPlusOne = multPlus - mult;

  if (unusedPierce > 0) {
    hints.push(
      `${unusedPierceStat} ${unusedPierce} is unused vs this target (${damageType} hits use ${activePierceStat}).`,
    );
  }
  if (piercePastHardCap > 0) {
    hints.push(
      `${activePierceStat} is past the 1.32 damage-multiplier cap — about ${piercePastHardCap.toFixed(
        0,
      )} pierce does nothing vs this defense.`,
    );
  } else if (marginalMultFromPlusOne < 1e-6 && activePierce > 0) {
    hints.push(`+1 ${activePierceStat} adds no multiplier at this point.`);
  } else if (eff < 0 && marginalMultFromPlusOne < 0.001) {
    hints.push(
      `Overpiercing: returns are soft (marginal +${(marginalMultFromPlusOne * 100).toFixed(
        3,
      )}% mult per pierce).`,
    );
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
}): CurvePoint[] {
  const from = args.pierceFrom ?? 0;
  const to = Math.max(from + 1, args.pierceTo ?? Math.max(pierceToHardCap(args.defense) + 20, 200));
  const steps = args.steps ?? 80;
  const points: CurvePoint[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const pierce = from + ((to - from) * i) / steps;
    const mult = damageMultiplier(effectiveDefense(args.defense, pierce));
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
  const overcap = value >= 100;
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
      `${stat} ≥ 100 — chance resist is capped at 100%; extra points do nothing for the roll${
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
    stat === "effectiveDefense" ||
    stat === "damageMultiplier" ||
    isStatusResistStat(stat)
  );
}

/** Short chips for the vs-monster panel. */
export function wasteChipsForLoadout(args: {
  damageType: DamageType | string | undefined;
  apiercing?: number;
  rpiercing?: number;
  monsterArmor?: number;
  monsterResistance?: number;
  statusResists?: Partial<Record<StatusResistStat, number>>;
}): string[] {
  const chips: string[] = [];
  const pierce = pierceWaste(args);
  for (const h of pierce.hints) chips.push(h);
  if (args.statusResists) {
    for (const stat of STATUS_RESIST_STATS) {
      const v = args.statusResists[stat];
      if (v == null || v < 100) continue;
      chips.push(`${stat} ≥ 100 (overcap)`);
    }
  }
  return chips;
}
