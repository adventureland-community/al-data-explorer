/**
 * Upgrade/compound success chance — mirrors server uscroll/cscroll paths.
 *
 * Failstack / primestack / server ugrace follow Kora Dereva's pastebin calculator
 * (CALC_VERSION 8, https://pastebin.com/jBMKeLfd). Zero-stack calls stay aligned
 * with the TypeScript bot module.
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./playerItemDisplay";

/** From design/upgrades.js — fallback when G.upgrades is missing. */
export const UPGRADE_BASE_CHANCES: Record<number, Record<number, number>> = {
  0: {
    1: 0.9999999,
    2: 0.98,
    3: 0.95,
    4: 0.7,
    5: 0.6,
    6: 0.4,
    7: 0.25,
    8: 0.15,
    9: 0.07,
    10: 0.024,
    11: 0.14,
    12: 0.11,
  },
  1: {
    1: 0.99998,
    2: 0.97,
    3: 0.94,
    4: 0.68,
    5: 0.58,
    6: 0.38,
    7: 0.24,
    8: 0.14,
    9: 0.066,
    10: 0.018,
    11: 0.13,
    12: 0.1,
  },
  2: {
    1: 0.97,
    2: 0.94,
    3: 0.92,
    4: 0.64,
    5: 0.52,
    6: 0.32,
    7: 0.232,
    8: 0.13,
    9: 0.062,
    10: 0.015,
    11: 0.12,
    12: 0.09,
  },
};

/** From design/compounds.js — fallback when G.compounds is missing. */
export const COMPOUND_BASE_CHANCES: Record<number, Record<number, number>> = {
  0: {
    1: 0.99,
    2: 0.75,
    3: 0.4,
    4: 0.25,
    5: 0.2,
    6: 0.1,
    7: 0.08,
    8: 0.05,
    9: 0.05,
    10: 0.05,
  },
  1: {
    1: 0.9,
    2: 0.7,
    3: 0.4,
    4: 0.2,
    5: 0.15,
    6: 0.08,
    7: 0.05,
    8: 0.05,
    9: 0.05,
    10: 0.03,
  },
  2: {
    1: 0.8,
    2: 0.6,
    3: 0.32,
    4: 0.16,
    5: 0.1,
    6: 0.05,
    7: 0.03,
    8: 0.03,
    9: 0.03,
    10: 0.02,
  },
};

const MANUAL_COMPOUND_IGRADE: Partial<Record<string, number>> = { lostearring: 2 };

export type ChanceItem = { name: ItemKey; level?: number; grace?: number };

export type ChanceResult = { chance: number; graceAfter: number; chanceCap: number };

export type ChanceStackOpts = {
  /** Personal ugrace proxy: failstack count from helmet farming. */
  failstack?: number;
  /** Ograce proxy: primestack count from offering-helmet farming. */
  primestack?: number;
  /** When true, also apply server ugrace from the same failstack count. */
  useServerUgrace?: boolean;
};

export type ChanceTables = {
  upgrades?: Record<string, Record<string, number>> | Record<number, Record<number, number>>;
  compounds?: Record<string, Record<string, number>> | Record<number, Record<number, number>>;
};

export type ItemLookup = (name: ItemKey) => GItem | undefined;

function tableChance(
  table: ChanceTables["upgrades"] | undefined,
  fallback: Record<number, Record<number, number>>,
  grade: number,
  newLevel: number,
): number {
  const fromG =
    table?.[grade as keyof typeof table] ?? table?.[String(grade) as keyof typeof table];
  if (fromG && typeof fromG === "object") {
    const raw =
      (fromG as Record<string | number, number>)[newLevel] ??
      (fromG as Record<string | number, number>)[String(newLevel)];
    if (typeof raw === "number") return raw;
  }
  return fallback[grade]?.[newLevel] ?? 0;
}

function itemIgrace(lookup: ItemLookup, name: ItemKey): number {
  const def = lookup(name);
  if (!def) return 0;
  const { igrace } = def as GItem & { igrace?: number };
  if (igrace != null) return igrace;
  const zero = getItemGrade(def, 0);
  if (!zero) return 1;
  if (zero === 1) return -1;
  if (zero === 2) return -2;
  return 0;
}

function compoundIgrade(lookup: ItemLookup, item: ChanceItem): number {
  const level = item.level ?? 0;
  if (item.name in MANUAL_COMPOUND_IGRADE) return MANUAL_COMPOUND_IGRADE[item.name]!;
  const def = lookup(item.name);
  if (!def) return 0;
  const zero = getItemGrade(def, 0);
  if (level >= 3) return getItemGrade(def, level - 2);
  return zero;
}

/**
 * Server lucky-slot roll tweak: when item_num matches, 60% of upgrades use
 * max(random/10000, result * 0.975 - 0.012).
 */
export function applyLuckySlotChance(chance: number): number {
  const boosted = Math.min(1, (chance + 0.012) / 0.975);
  return 0.6 * boosted + 0.4 * chance;
}

function stackGraceBonus(opts?: ChanceStackOpts): {
  rawUgrace: number;
  rawServerUgrace: number;
  rawOgrace: number;
} {
  const failstack = opts?.failstack ?? 0;
  const primestack = opts?.primestack ?? 0;
  return {
    rawUgrace: Math.min(3, failstack / 4.5),
    rawServerUgrace: opts?.useServerUgrace ? Math.min(6, failstack / 3) : 0,
    rawOgrace: (primestack * 0.6) / 3.2,
  };
}

export function getUpgradeChance(
  lookup: ItemLookup,
  item: ChanceItem,
  scrollGrade: number,
  offeringGrade: number | null,
  tables?: ChanceTables,
  stackOpts?: ChanceStackOpts,
): ChanceResult {
  const def = lookup(item.name);
  if (!def) return { chance: 0, graceAfter: 0, chanceCap: 0 };

  let grace = item.grace ?? 0;
  const grade = getItemGrade(def, item.level ?? 0);
  if (grade > scrollGrade) return { chance: 0, graceAfter: 0, chanceCap: 0 };

  const newLevel = (item.level ?? 0) + 1;
  const zeroGrade = getItemGrade(def, 0);
  let probability = tableChance(tables?.upgrades, UPGRADE_BASE_CHANCES, zeroGrade, newLevel);
  const oprobability = probability;
  if (!probability) return { chance: 0, graceAfter: 0, chanceCap: 0 };

  let high = false;
  let newGrace = grace;
  const { rawUgrace, rawServerUgrace, rawOgrace } = stackGraceBonus(stackOpts);

  // Pastebin: min(cap, item_grace + ugrace) then + server ugrace + ograce outside the min.
  grace = Math.max(
    0,
    Math.min(newLevel + 1, grace + itemIgrace(lookup, item.name) + rawUgrace) +
      rawServerUgrace +
      rawOgrace,
  );
  grace = (probability * grace) / newLevel + grace / 1000;

  if (scrollGrade > grade && newLevel <= 10) {
    probability = probability * 1.2 + 0.01;
    high = true;
    newGrace += 0.4;
  }

  if (offeringGrade != null) {
    let increase = 0.4;
    const diff = offeringGrade - grade;
    if (diff > 1) {
      probability = probability * 1.7 + grace * 4;
      high = true;
      increase = 3;
    } else if (diff > 0) {
      probability = probability * 1.5 + grace * 1.2;
      high = true;
      increase = 1;
    } else if (diff === 0) {
      probability = probability * 1.4 + grace;
    } else if (diff === -1) {
      probability = probability * 1.15 + grace / 3.2;
      increase = 0.2;
    } else {
      probability = probability * 1.08 + grace / 4;
      increase = 0.1;
    }
    newGrace += increase;
  } else {
    grace = Math.max(0, grace / 4.8 - 0.4 / (newLevel - 0.999) ** 2);
    probability += grace;
  }

  const chanceCap = high
    ? Math.min(oprobability + 0.36, oprobability * 3)
    : Math.min(oprobability + 0.24, oprobability * 2);
  probability = Math.min(probability, chanceCap);
  return {
    chance: Math.min(probability, 1),
    graceAfter: newGrace,
    chanceCap: Math.min(chanceCap, 1),
  };
}

export function getCompoundChance(
  lookup: ItemLookup,
  item: ChanceItem,
  scrollGrade: number,
  offeringGrade: number | null,
  tables?: ChanceTables,
  stackOpts?: ChanceStackOpts,
): ChanceResult {
  const def = lookup(item.name);
  if (!def) return { chance: 0, graceAfter: 0, chanceCap: 0 };

  let grace = item.grace ?? 0;
  const grade = getItemGrade(def, item.level ?? 0);
  if (grade > scrollGrade) return { chance: 0, graceAfter: 0, chanceCap: 0 };

  const newLevel = (item.level ?? 0) + 1;
  const igrade = compoundIgrade(lookup, item);
  let probability = tableChance(tables?.compounds, COMPOUND_BASE_CHANCES, igrade, newLevel);
  const oprobability = probability;
  if (!probability) return { chance: 0, graceAfter: 0, chanceCap: 0 };

  let high: number | boolean = false;
  let graceBonus = 0;
  let newGrace = grace;
  const primestack = stackOpts?.primestack ?? 0;
  const ograce = primestack * 0.6;
  const graceSum = grace * 3;

  if (scrollGrade > grade) {
    probability = probability * 1.1 + 0.001;
    graceBonus += 0.4;
    high = scrollGrade - grade;
  }

  if (offeringGrade != null) {
    let increase = 0.5;
    grace = 0.027 * (graceSum + 0.5 + ograce);
    const diff = offeringGrade - grade;
    if (diff > 1) {
      probability = probability * 1.64 + grace * 2;
      high = 1;
      increase = 3;
    } else if (diff > 0) {
      probability = probability * 1.48 + grace;
      high = 1;
      increase = 1;
    } else if (diff === 0) {
      probability = probability * 1.36 + Math.min(30 * 0.027, grace);
    } else if (diff === -1) {
      probability =
        probability * 1.15 + Math.min(25 * 0.019, grace) / Math.max((item.level ?? 0) - 2, 1);
      increase = 0.2;
    } else {
      probability =
        probability * 1.08 + Math.min(15 * 0.015, grace) / Math.max((item.level ?? 0) - 1, 1);
      increase = 0.1;
    }
    newGrace = grace * 3;
    graceBonus += increase;
  } else {
    grace = 0.007 * (graceSum + ograce);
    probability += Math.min(25 * 0.007, grace) / Math.max((item.level ?? 0) - 1, 1);
    newGrace = item.grace ?? 0;
  }

  newGrace = newGrace / 6.4 + graceBonus;
  const chanceCap = Math.min(
    oprobability * (3 + (high ? (high as number) * 0.6 : 0)),
    oprobability + 0.2 + (high ? (high as number) * 0.05 : 0),
  );
  probability = Math.min(probability, chanceCap);
  return {
    chance: Math.min(probability, 1),
    graceAfter: newGrace,
    chanceCap: Math.min(chanceCap, 1),
  };
}

/** Offering grade: null = none, 0 = offeringp, 1 = offering, 2 = offeringx */
export const OFFERING_GRADES = [null, 0, 1, 2] as const;
export type OfferingChoice = typeof OFFERING_GRADES[number];
