import { ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { rollAbilityProcsOnHit, collectSplashHitStats, totalSplashPerHit } from "./abilityProc";
import {
  collectGearAbilities,
  collectSplashIntensities,
  collectUnsimulatedOnHitEffects,
  estimateAbilityDps,
} from "./estimateAbilityDps";
import { estimateHitDamage } from "./estimateHitDamage";
import type { CombatEntity, CombatSimOptions, DpsBreakdown } from "./types";

export type TotalDpsMode = "formulation" | "event";

export type TotalDpsOptions = CombatSimOptions & {
  mode?: TotalDpsMode;
  classKey?: string;
};

function buildSplashBreakdown(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance">,
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  options: TotalDpsOptions | undefined,
  freq: number,
): {
  splashDps: number;
  splashLines: DpsBreakdown["splashLines"];
  unsimulatedEffects: DpsBreakdown["unsimulatedEffects"];
} {
  const splashTargetCount = options?.splashTargetCount ?? 0;
  const intensities = collectSplashIntensities(gear, G, options?.classKey, source.damage_type);
  const splashStats = collectSplashHitStats(source, target, intensities);
  const perHit = totalSplashPerHit(splashStats);

  if (splashTargetCount <= 0 || perHit <= 0 || freq <= 0) {
    return {
      splashDps: 0,
      splashLines: undefined,
      unsimulatedEffects: collectUnsimulatedOnHitEffects(
        gear,
        G,
        options?.classKey,
        source.damage_type,
        0,
      ),
    };
  }

  const splashDps = freq * splashTargetCount * perHit;
  const splashLines = splashStats.map((row) => ({
    key: row.key,
    label: row.label,
    dps: freq * splashTargetCount * row.damagePerTarget,
    detail: `${splashTargetCount} nearby · ${row.damagePerTarget.toFixed(1)} dmg/hit/target`,
  }));

  return { splashDps, splashLines, unsimulatedEffects: undefined };
}

/** Event-driven combat timeline: auto attacks, crit/variance, ability proc rolls, splash. */
export function simulateCombatTimeline(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  options?: TotalDpsOptions,
): DpsBreakdown {
  const durationMs = options?.durationMs ?? 30_000;
  const freq = source.frequency ?? 0;
  const rng = options?.rng ?? Math.random;
  const { damage: baseHit, mitigationMult } = estimateHitDamage(source, target, {
    ...options,
    expectedCrit: false,
  });

  const abilities = collectGearAbilities(gear, G, options?.classKey);
  const splashTargetCount = options?.splashTargetCount ?? 0;
  const splashStats = collectSplashHitStats(
    source,
    target,
    collectSplashIntensities(gear, G, options?.classKey, source.damage_type),
  );
  const splashPerTargetPerHit = totalSplashPerHit(splashStats);

  if (freq <= 0 || baseHit <= 0 || durationMs <= 0) {
    const splash = buildSplashBreakdown(source, target, gear, G, options, freq);
    return {
      hitDamage: baseHit,
      mitigationMult,
      autoAttackDps: 0,
      abilityDps: 0,
      splashDps: splash.splashDps,
      splashLines: splash.splashLines,
      totalDps: 0,
      hitsToKill: null,
      unsimulatedEffects: splash.unsimulatedEffects,
      simDurationMs: durationMs,
      simIterations: 0,
    };
  }

  const attackIntervalMs = 1000 / freq;
  let autoDamage = 0;
  let abilityDamage = 0;
  let splashDamage = 0;
  let hits = 0;
  let t = 0;
  const abilityTotals: Record<string, number> = {};

  while (t < durationMs) {
    const variance = 0.9 + rng() * 0.2;
    let hit = baseHit * variance;

    if (source.crit && rng() < source.crit / 100) {
      let critMult = 2;
      if (source.critdamage) critMult += source.critdamage / 100;
      hit *= critMult;
    }

    autoDamage += hit;
    hits += 1;

    const procs = rollAbilityProcsOnHit(hit, abilities, rng);
    abilityDamage += procs.total;
    for (const [key, amount] of Object.entries(procs.byKey)) {
      abilityTotals[key] = (abilityTotals[key] ?? 0) + amount;
    }

    if (splashTargetCount > 0 && splashPerTargetPerHit > 0) {
      splashDamage += splashPerTargetPerHit * splashTargetCount;
    }

    t += attackIntervalMs;
  }

  const seconds = durationMs / 1000;
  const autoAttackDps = autoDamage / seconds;
  const abilityDps = abilityDamage / seconds;
  const splashDps = splashDamage / seconds;

  const abilityLines = Object.entries(abilityTotals).map(([key, total]) => ({
    key,
    label: key,
    dps: total / seconds,
    detail: "Event sim proc rolls",
  }));

  const splashLines =
    splashDps > 0
      ? splashStats.map((row) => ({
          key: row.key,
          label: row.label,
          dps: (row.damagePerTarget * splashTargetCount * hits) / seconds,
          detail: `${splashTargetCount} nearby · rolled ${hits} hits`,
        }))
      : undefined;

  let hitsToKill: number | null = null;
  if (target.hp != null && target.hp > 0 && baseHit > 0) {
    hitsToKill = Math.ceil(target.hp / baseHit);
  }

  const unsimulated =
    splashTargetCount <= 0
      ? collectUnsimulatedOnHitEffects(gear, G, options?.classKey, source.damage_type, 0)
      : undefined;

  return {
    hitDamage: baseHit,
    mitigationMult,
    autoAttackDps,
    abilityDps,
    abilityLines: abilityLines.length > 0 ? abilityLines : undefined,
    splashDps: splashDps > 0 ? splashDps : undefined,
    splashLines,
    totalDps: autoAttackDps + abilityDps + splashDps,
    hitsToKill,
    unsimulatedEffects: unsimulated?.length ? unsimulated : undefined,
    simDurationMs: durationMs,
    simIterations: hits,
  };
}

/** @deprecated Use simulateCombatTimeline */
export function simulateAutoAttackTimeline(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  options?: CombatSimOptions,
): DpsBreakdown {
  return simulateCombatTimeline(source, target, {}, {} as CustomGData, options);
}

/** Formulation + ability uplift + optional splash targets. */
export function estimateTotalDps(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  G: CustomGData,
  gear: { [slot in SlotType]?: ItemInfo },
  options?: TotalDpsOptions,
): DpsBreakdown {
  if (options?.mode === "event") {
    return simulateCombatTimeline(source, target, gear, G, options);
  }

  const { damage: hitDamage, mitigationMult } = estimateHitDamage(source, target, options);
  const freq = source.frequency ?? 0;
  const autoAttackDps = hitDamage * freq;

  const abilities = collectGearAbilities(gear, G, options?.classKey);
  const { abilityDps, lines } = estimateAbilityDps(source, target, abilities);
  const { splashDps, splashLines, unsimulatedEffects } = buildSplashBreakdown(
    source,
    target,
    gear,
    G,
    options,
    freq,
  );
  const totalDps = autoAttackDps + abilityDps + splashDps;

  let hitsToKill: number | null = null;
  if (target.hp != null && target.hp > 0 && hitDamage > 0) {
    hitsToKill = Math.ceil(target.hp / hitDamage);
  }

  return {
    hitDamage,
    mitigationMult,
    autoAttackDps,
    abilityDps,
    abilityLines: lines,
    splashDps: splashDps > 0 ? splashDps : undefined,
    splashLines,
    unsimulatedEffects,
    totalDps,
    hitsToKill,
  };
}
