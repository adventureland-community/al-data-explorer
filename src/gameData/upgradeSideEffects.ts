/**
 * Upgrade/compound side effects from the server uscroll / cscroll / polish paths.
 *
 * Scroll path edge bucket (`parseInt(result*10000) == parseInt(chance*10000)`):
 * - success → Lucky title (upgrade needs grade ≥ 1; compound ungated)
 * - fail → Essence of Greed (upgrade, grade ≥ 1, free inventory slot)
 *
 * Other live effects:
 * - Bonus +1 grace at 2.5% per uscroll click
 * - Shiny polish: no scroll + ingot/nugget (`.offering`); fail keeps the item
 * - Dark Tri-Stone: 1.2% rename when compounding ctristone 0→1 successfully
 * - Booster compound: chance ≈ 1; with an offering, cascading 12%/6%/… extra levels
 *
 * Fast / Super Fast titles exist in G.titles (source: upgrade) but the server
 * assignment is commented out — reported as inactive.
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./itemGrade";
import type { MaterialLine, PlanSummaryStep } from "./upgradePathSummary";
import { POLISH_MATERIAL_KEYS, PriceTable, unitPrice } from "./upgradePrices";

/** Width of the integer bucket used by `parseInt(x * 10000)`. */
export const EDGE_BUCKET = 1 / 10000;

/** Server: `Math.random() < 0.025` → `item.grace += 1` on a real uscroll click. */
export const BONUS_GRACE_CHANCE = 0.025;

/** Compound success of ctristone to +1 → rename to cdarktristone. */
export const DARK_TRISTONE_CHANCE = 0.012;

/** Booster compound with an offering: first extra-level proc; halves each cascade. */
export const BOOSTER_EXTRA_PROC = 0.12;

/** Platinum-tier polish uses the higher base chance when item value ≤ this. */
export const SHINY_VALUE_CHANCE_CAP = 20_000_000;

/** Server-forced booster compound success chance. */
export const BOOSTER_COMPOUND_CHANCE = 0.9999999999999;

/** Ingot/nugget polish materials (`G.items[k].offering`). */
export const POLISH_MATERIALS = [
  { key: "goldnugget" as const, offering: 0 },
  { key: "bronzeingot" as const, offering: 0.1 },
  { key: "platinumnugget" as const, offering: 1 },
  { key: "goldingot" as const, offering: 1.1 },
  { key: "platinumingot" as const, offering: 2 },
] as const;

export type PolishMaterialKey = typeof POLISH_MATERIALS[number]["key"];

export { POLISH_MATERIAL_KEYS };

export type EdgeBucketOdds = {
  /** Fractional position of `chance` inside its 1/10000 bucket, in [0, 1). */
  frac: number;
  /** P(same bucket ∩ success) on one attempt. */
  luckyPerAttempt: number;
  /** P(same bucket ∩ fail) on one attempt. */
  greedPerAttempt: number;
};

/**
 * Split of the chance-edge bucket into success (Lucky) vs fail (Greed) slices.
 * Returns zeros when chance is outside (0, 1).
 */
export function edgeBucketOdds(chance: number): EdgeBucketOdds {
  if (!(chance > 0) || !(chance < 1) || !Number.isFinite(chance)) {
    return { frac: 0, luckyPerAttempt: 0, greedPerAttempt: 0 };
  }
  const scaled = chance * 10000;
  const frac = scaled - Math.floor(scaled);
  return {
    frac,
    luckyPerAttempt: frac * EDGE_BUCKET,
    greedPerAttempt: (1 - frac) * EDGE_BUCKET,
  };
}

/**
 * Expected Lucky titles / Essence of Greed while completing one step once
 * (geometric retries until success).
 *
 * E[lucky] = frac / (p * 10000)
 * E[greed] = (1 - frac) / (p * 10000)
 */
export function expectedEdgeOutcomes(chance: number): { lucky: number; greed: number } {
  if (!(chance > 0) || !(chance < 1) || !Number.isFinite(chance)) {
    return { lucky: 0, greed: 0 };
  }
  const { frac } = edgeBucketOdds(chance);
  return {
    lucky: frac / (chance * 10000),
    greed: (1 - frac) / (chance * 10000),
  };
}

/**
 * Shiny polish success chance (no scroll, material with `.offering`).
 * Returns null when the material's offering tier is below the item's zero-level grade.
 */
export function shinyPolishChance(args: {
  itemZeroGrade: number;
  polishOffering: number;
  itemValue: number;
}): number | null {
  const { itemZeroGrade, polishOffering, itemValue } = args;
  if (!(itemZeroGrade >= 0) || itemZeroGrade > 2) return null;
  if (polishOffering < itemZeroGrade) return null;

  let chance = 0.16;
  if (
    polishOffering > itemZeroGrade ||
    (polishOffering === 2 && itemValue <= SHINY_VALUE_CHANCE_CAP)
  ) {
    chance = 0.32;
  }
  const mult = ([2.8, 1.6, 1] as const)[itemZeroGrade as 0 | 1 | 2] ?? 1;
  return Math.min(1, chance * mult);
}

export type ShinyPolishOption = {
  key: PolishMaterialKey;
  offering: number;
  chance: number;
  expectedAttempts: number;
  unitPrice: number;
  expectedCost: number;
  /** Material is below item zero-grade — server rejects. */
  invalid: boolean;
};

/** Expected polish attempts/cost for each catalog ingot/nugget (fail keeps the item). */
export function listShinyPolishOptions(args: {
  gItem: GItem;
  itemValue: number;
  prices: PriceTable;
}): ShinyPolishOption[] {
  const zeroGrade = getItemGrade(args.gItem, 0);
  return POLISH_MATERIALS.map((mat) => {
    const chance = shinyPolishChance({
      itemZeroGrade: zeroGrade,
      polishOffering: mat.offering,
      itemValue: args.itemValue,
    });
    const price = unitPrice(args.prices, mat.key);
    if (chance == null || !(chance > 0)) {
      return {
        key: mat.key,
        offering: mat.offering,
        chance: 0,
        expectedAttempts: Infinity,
        unitPrice: price,
        expectedCost: Infinity,
        invalid: true,
      };
    }
    const attempts = 1 / chance;
    const expectedCost = Number.isFinite(price) ? attempts * price : Infinity;
    return {
      key: mat.key,
      offering: mat.offering,
      chance,
      expectedAttempts: attempts,
      unitPrice: price,
      expectedCost,
      invalid: false,
    };
  });
}

/** Server polish click is 2000ms; calculator assumes Mass Production++ (/10). */
export const SHINY_SHRINE_MS = 200;

/** Prefer a named polish material, else the cheapest valid EV. */
export function pickShinyPolish(args: {
  gItem: GItem;
  itemValue: number;
  prices: PriceTable;
  preferredKey?: string | null;
}): ShinyPolishOption | null {
  const valid = listShinyPolishOptions(args).filter(
    (o) => !o.invalid && Number.isFinite(o.expectedCost) && o.expectedCost > 0,
  );
  if (!valid.length) return null;
  if (args.preferredKey) {
    const preferred = valid.find((o) => o.key === args.preferredKey);
    if (preferred) return preferred;
  }
  let best = valid[0];
  for (const o of valid) {
    if (o.expectedCost < best.expectedCost) best = o;
  }
  return best;
}

export type PlanSummaryBundle = {
  steps: PlanSummaryStep[];
  materials: MaterialLine[];
  totalExpectedCost: number;
};

/**
 * Insert a Shiny polish step at +0 (after Acquire when present).
 *
 * Server (`upgrade`): ingot/nugget offerings are only valid when
 * `!(item.level > 0)`. Fail keeps the item; success sets `item.p = "shiny"`.
 * Upgrading the same object keeps the title. Craft/loot can also roll shiny
 * (1/500 on upgradeables) — not modeled here.
 *
 * Each expected base copy needs its own polish campaign before climbing
 * (`copies`, default from Acquire.attempts when present).
 */
export function applyShinyPolishToSummary(args: {
  summary: PlanSummaryBundle;
  polish: ShinyPolishOption;
  /** Unused — polish is always applied at level 0 (server rule). */
  targetLevel?: number;
  /** Expected +0 copies that each need polish. Defaults to Acquire.attempts or 1. */
  copies?: number;
}): PlanSummaryBundle {
  const { summary, polish } = args;
  const acquire = summary.steps.find((s) => s.kind === "acquire");
  const copiesRaw = args.copies ?? acquire?.attempts ?? 1;
  const copies = Number.isFinite(copiesRaw) && copiesRaw > 0 ? Math.max(copiesRaw, 1) : 1;

  const attemptsPerCopy = polish.expectedAttempts;
  const costPerCopy = polish.expectedCost;
  const attempts = attemptsPerCopy * copies;
  const stepSpend = costPerCopy * copies;

  const shinyStep: PlanSummaryStep = {
    fromLevel: 0,
    toLevel: 0,
    scrollKey: "",
    offeringKey: polish.key,
    primstacking: 0,
    primstackingStatClicks: 0,
    primstackingNormal: 0,
    primstackingStatScrollEach: 0,
    statScrollGrace: 0,
    failstack: 0,
    ograce: 0,
    chance: polish.chance,
    attempts,
    stepSpend,
    runningTotal: 0,
    shrineMs: Number.isFinite(attempts) ? attempts * SHINY_SHRINE_MS : Infinity,
    kind: "shiny",
  };

  const acquireIdx = summary.steps.findIndex((s) => s.kind === "acquire");
  const insertAt = acquireIdx >= 0 ? acquireIdx + 1 : 0;
  const steps = [...summary.steps];
  steps.splice(insertAt, 0, shinyStep);

  let running = 0;
  for (const s of steps) {
    running += Number.isFinite(s.stepSpend) ? s.stepSpend : 0;
    s.runningTotal = running;
  }

  const materials = summary.materials.map((m) => ({ ...m }));
  const existing = materials.find((m) => m.itemKey === polish.key);
  if (existing) {
    existing.expectedQty += attempts;
    existing.total = Number.isFinite(existing.unitPrice)
      ? existing.unitPrice * existing.expectedQty
      : Infinity;
  } else {
    materials.push({
      itemKey: polish.key,
      expectedQty: attempts,
      unitPrice: Number.isFinite(polish.unitPrice) ? polish.unitPrice : 0,
      total: stepSpend,
    });
  }
  materials.sort((a, b) => a.itemKey.localeCompare(b.itemKey));

  return {
    steps,
    materials,
    totalExpectedCost:
      (Number.isFinite(summary.totalExpectedCost) ? summary.totalExpectedCost : 0) +
      (Number.isFinite(stepSpend) ? stepSpend : 0),
  };
}

/**
 * Expected extra levels from booster compound's cascading proc
 * (`proc = 0.12`, halves after each success) when an offering was used.
 */
export function expectedBoosterExtras(hasOffering: boolean): number {
  if (!hasOffering) return 0;
  let proc = BOOSTER_EXTRA_PROC;
  let reach = 1;
  let expected = 0;
  for (let i = 0; i < 48; i++) {
    reach *= proc;
    if (reach < 1e-18) break;
    expected += reach;
    proc /= 2;
  }
  return expected;
}

export function isBoosterItem(gItem: GItem | undefined): boolean {
  return (gItem as { type?: string } | undefined)?.type === "booster";
}

export function isWeaponItem(gItem: GItem | undefined): boolean {
  if (!gItem) return false;
  const { type, wtype } = gItem as GItem & { type?: string; wtype?: string };
  return type === "weapon" || wtype != null;
}

export type SideEffectStep = {
  fromLevel: number;
  toLevel: number;
  chance: number;
  grade: number;
  /** Upgrade Lucky / Greed need grade ≥ 1; compound Lucky has no grade gate. */
  eligibleLucky: boolean;
  eligibleGreed: boolean;
  expectedLucky: number;
  expectedGreed: number;
  expectedBonusGrace: number;
  expectedAttempts: number;
  /** Booster offering cascade extras for this compound step. */
  expectedBoosterExtras: number;
};

export type DarkTristoneEffect = {
  chance: number;
  /** Expected dark stones from completing the 0→1 compound once. */
  expected: number;
  fromLevel: number;
  toLevel: number;
};

export type InactiveTitleNote = {
  key: "fast" | "superfast";
  label: string;
  note: string;
};

export type SideEffectSummary = {
  steps: SideEffectStep[];
  expectedLucky: number;
  expectedGreed: number;
  expectedBonusGrace: number;
  /** True when any step can roll Lucky or Greed. */
  anyEligible: boolean;
  darkTristone: DarkTristoneEffect | null;
  /** Sum of expected booster extras across compound steps that used an offering. */
  expectedBoosterExtras: number;
  /** Booster compounds always succeed (~1); extras need an offering. */
  isBooster: boolean;
  inactiveTitles: InactiveTitleNote[];
};

export function summarizeUpgradeSideEffects(args: {
  steps: PlanSummaryStep[];
  gItem: GItem | undefined;
  itemKey?: ItemKey | string;
  mode: "upgrade" | "compound";
}): SideEffectSummary {
  const { steps, gItem, mode } = args;
  const out: SideEffectStep[] = [];
  let expectedLucky = 0;
  let expectedGreed = 0;
  let expectedBonusGrace = 0;
  let expectedBoosterExtrasTotal = 0;
  let anyEligible = false;
  const booster = isBoosterItem(gItem);

  for (const step of steps) {
    if (step.kind === "shiny" || step.kind === "acquire") continue;
    const grade = gItem ? getItemGrade(gItem, step.fromLevel) : 0;
    const eligibleLucky = mode === "compound" || grade >= 1;
    const eligibleGreed = mode === "upgrade" && grade >= 1;
    if (eligibleLucky || eligibleGreed) anyEligible = true;

    const attempts = step.chance > 0 && Number.isFinite(step.chance) ? 1 / step.chance : Infinity;
    const edge = expectedEdgeOutcomes(step.chance);
    const lucky = eligibleLucky ? edge.lucky : 0;
    const greed = eligibleGreed ? edge.greed : 0;
    const bonusGrace =
      mode === "upgrade" && Number.isFinite(attempts) ? attempts * BONUS_GRACE_CHANCE : 0;
    const boosterExtras =
      mode === "compound" && booster ? expectedBoosterExtras(step.offeringKey != null) : 0;

    expectedLucky += lucky;
    expectedGreed += greed;
    expectedBonusGrace += bonusGrace;
    expectedBoosterExtrasTotal += boosterExtras;

    out.push({
      fromLevel: step.fromLevel,
      toLevel: step.toLevel,
      chance: step.chance,
      grade,
      eligibleLucky,
      eligibleGreed,
      expectedLucky: lucky,
      expectedGreed: greed,
      expectedBonusGrace: bonusGrace,
      expectedAttempts: attempts,
      expectedBoosterExtras: boosterExtras,
    });
  }

  let darkTristone: DarkTristoneEffect | null = null;
  if (mode === "compound" && args.itemKey === "ctristone") {
    const step = steps.find((s) => s.fromLevel === 0 && s.toLevel === 1 && s.kind !== "shiny");
    if (step) {
      darkTristone = {
        chance: DARK_TRISTONE_CHANCE,
        expected: DARK_TRISTONE_CHANCE,
        fromLevel: 0,
        toLevel: 1,
      };
    }
  }

  const inactiveTitles: InactiveTitleNote[] = [];
  if (mode === "upgrade" && isWeaponItem(gItem)) {
    inactiveTitles.push(
      {
        key: "fast",
        label: "Fast",
        note: "G.titles entry (source: upgrade); server assignment is commented out.",
      },
      {
        key: "superfast",
        label: "Super Fast",
        note: "G.titles entry (source: upgrade); server assignment is commented out.",
      },
    );
  }

  return {
    steps: out,
    expectedLucky,
    expectedGreed,
    expectedBonusGrace,
    anyEligible,
    darkTristone,
    expectedBoosterExtras: expectedBoosterExtrasTotal,
    isBooster: booster,
    inactiveTitles,
  };
}
