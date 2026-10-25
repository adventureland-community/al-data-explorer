/**
 * Per-level upgrade chances with techniques peeled on one at a time.
 * Used by the plan chart so kit / prim / stacks / lucky stay comparable.
 */

import { GItem, ItemKey } from "typed-adventureland";

import { getItemGrade } from "./itemGrade";
import { applyLuckySlotChance, getUpgradeChance, OfferingChoice } from "./upgradeChance";
import type { PlannerContext, UpgradePathStep } from "./upgradePath";

const MAX_ITEM_GRACE = 13;
const PRIMSTACK_GRACE = 0.5;

export const TECHNIQUE_CHANCE_IDS = [
  "kit",
  "prim",
  "statGrace",
  "failstack",
  "ograce",
  "serverUgrace",
  "plan",
  "lucky",
] as const;

export type TechniqueChanceId = typeof TECHNIQUE_CHANCE_IDS[number];

export type TechniqueChanceMeta = {
  id: TechniqueChanceId;
  label: string;
  hint: string;
};

export const TECHNIQUE_CHANCE_META: TechniqueChanceMeta[] = [
  {
    id: "kit",
    label: "Kit only",
    hint: "Scroll + offering at this step’s leftover grace — no prim / pscroll / helmet banks",
  },
  {
    id: "prim",
    label: "+ Primstacking",
    hint: "Primlings on the item (+0.5 grace each)",
  },
  {
    id: "statGrace",
    label: "+ Stat scroll grace",
    hint: "Property scroll + offering for +1 item.grace",
  },
  {
    id: "failstack",
    label: "+ Failstack",
    hint: "Personal ugrace from failing vendor helmets",
  },
  {
    id: "ograce",
    label: "+ Ograce",
    hint: "Banked player.p.ograce from offering fails",
  },
  {
    id: "serverUgrace",
    label: "+ Server ugrace",
    hint: "S.ugrace from the same failstack count",
  },
  {
    id: "plan",
    label: "Plan (in-game)",
    hint: "Full recipe — matches the upgrade UI chance",
  },
  {
    id: "lucky",
    label: "Lucky EV",
    hint: "Expected success with Lucky Slot (game UI does not show this)",
  },
];

export type TechniqueChancePoint = {
  fromLevel: number;
  toLevel: number;
  /** Absolute success chances 0–1 for each technique layer. */
  chances: Partial<Record<TechniqueChanceId, number>>;
};

function itemIgraceFromDef(def: GItem): number {
  const { igrace } = def as GItem & { igrace?: number };
  if (igrace != null) return igrace;
  const zero = getItemGrade(def, 0);
  if (!zero) return 1;
  if (zero === 1) return -1;
  if (zero === 2) return -2;
  return 0;
}

function chanceAt(
  ctx: PlannerContext,
  itemName: ItemKey,
  fromLevel: number,
  grace: number,
  scrollGrade: number,
  offering: OfferingChoice,
  stackOpts?: { failstack?: number; ograce?: number; useServerUgrace?: boolean },
): number {
  const { chance } = getUpgradeChance(
    ctx.lookup,
    { name: itemName, level: fromLevel, grace },
    scrollGrade,
    offering,
    ctx.tables,
    stackOpts,
  );
  return chance;
}

/**
 * Walk a recomputed upgrade plan and score each step under layered techniques.
 * Prim / stat / failstack / ograce amounts come from the plan recipe (0 → that
 * layer matches the previous one and can be hidden in the UI).
 */
export function buildUpgradeTechniqueChances(args: {
  ctx: PlannerContext;
  itemName: ItemKey;
  steps: UpgradePathStep[];
  luckySlot?: boolean;
  startGrace?: number;
}): TechniqueChancePoint[] {
  const def = args.ctx.lookup(args.itemName);
  if (!def || !args.steps.length) return [];

  let grace = args.startGrace ?? itemIgraceFromDef(def);
  const points: TechniqueChancePoint[] = [];

  for (const step of args.steps) {
    const prim = Math.max(0, step.primstacking ?? 0);
    const statScrollGrace = Math.max(0, step.statScrollGrace ?? 0);
    const failstack = Math.max(0, step.failstack ?? 0);
    const ograce = Math.max(0, step.ograce ?? 0);
    const { scrollGrade } = step;
    const { offering } = step;

    const kitGrace = Math.min(MAX_ITEM_GRACE, grace);
    const primGrace = Math.min(MAX_ITEM_GRACE, grace + prim * PRIMSTACK_GRACE);
    const prepGrace = Math.min(MAX_ITEM_GRACE, grace + prim * PRIMSTACK_GRACE + statScrollGrace);

    const kit = chanceAt(args.ctx, args.itemName, step.fromLevel, kitGrace, scrollGrade, offering);
    const withPrim = chanceAt(
      args.ctx,
      args.itemName,
      step.fromLevel,
      primGrace,
      scrollGrade,
      offering,
    );
    const withStat = chanceAt(
      args.ctx,
      args.itemName,
      step.fromLevel,
      prepGrace,
      scrollGrade,
      offering,
    );
    const withFs = chanceAt(
      args.ctx,
      args.itemName,
      step.fromLevel,
      prepGrace,
      scrollGrade,
      offering,
      { failstack },
    );
    const withOgrace = chanceAt(
      args.ctx,
      args.itemName,
      step.fromLevel,
      prepGrace,
      scrollGrade,
      offering,
      { failstack, ograce },
    );
    const withServer = chanceAt(
      args.ctx,
      args.itemName,
      step.fromLevel,
      prepGrace,
      scrollGrade,
      offering,
      { failstack, ograce, useServerUgrace: true },
    );
    const plan = chanceAt(
      args.ctx,
      args.itemName,
      step.fromLevel,
      prepGrace,
      scrollGrade,
      offering,
      {
        failstack,
        ograce,
        useServerUgrace: args.ctx.useServerUgrace === true,
      },
    );
    const lucky = applyLuckySlotChance(plan);

    const chances: Partial<Record<TechniqueChanceId, number>> = { kit, plan };
    if (prim > 0) chances.prim = withPrim;
    if (statScrollGrace > 0) chances.statGrace = withStat;
    if (failstack > 0) chances.failstack = withFs;
    if (ograce > 0) chances.ograce = withOgrace;
    // Server layer only when it can move the needle (needs a failstack bank).
    if (failstack > 0) chances.serverUgrace = withServer;
    if (args.luckySlot) chances.lucky = lucky;

    points.push({
      fromLevel: step.fromLevel,
      toLevel: step.toLevel,
      chances,
    });

    grace = step.graceAfter;
  }

  return points;
}

/** Series that differ from `kit` (or prior layer) on at least one step. */
export function activeTechniqueSeries(points: TechniqueChancePoint[]): TechniqueChanceId[] {
  if (!points.length) return [];
  const active: TechniqueChanceId[] = ["kit", "plan"];
  for (const id of TECHNIQUE_CHANCE_IDS) {
    if (id === "kit" || id === "plan") continue;
    let useful = false;
    for (const p of points) {
      const v = p.chances[id];
      if (v == null || !Number.isFinite(v)) continue;
      const baseline =
        id === "lucky"
          ? p.chances.plan
          : id === "serverUgrace"
          ? p.chances.ograce ?? p.chances.failstack ?? p.chances.plan
          : id === "ograce"
          ? p.chances.failstack ?? p.chances.statGrace ?? p.chances.prim ?? p.chances.kit
          : id === "failstack"
          ? p.chances.statGrace ?? p.chances.prim ?? p.chances.kit
          : id === "statGrace"
          ? p.chances.prim ?? p.chances.kit
          : p.chances.kit;
      if (baseline == null) {
        useful = true;
        break;
      }
      if (Math.abs(v - baseline) > 0.0005) {
        useful = true;
        break;
      }
    }
    if (useful) active.push(id);
  }
  // Stable glossary order.
  return TECHNIQUE_CHANCE_IDS.filter((id) => active.includes(id));
}
