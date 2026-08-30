import { ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { estimateHitDamage } from "./estimateHitDamage";
import {
  collectGearAbilities,
  estimateAbilityDps,
  collectUnsimulatedOnHitEffects,
} from "./estimateAbilityDps";
import type { CombatEntity, CombatSimOptions, DpsBreakdown } from "./types";

export type TotalDpsMode = "formulation" | "event";

export type TotalDpsOptions = CombatSimOptions & {
  mode?: TotalDpsMode;
  classKey?: string;
};

/** Event-driven auto-attack timeline with ±10% damage variance (phase 3). */
export function simulateAutoAttackTimeline(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  options?: CombatSimOptions,
): DpsBreakdown {
  const durationMs = options?.durationMs ?? 30_000;
  const freq = source.frequency ?? 0;
  const { damage: baseHit, mitigationMult } = estimateHitDamage(source, target, {
    ...options,
    expectedCrit: false,
  });

  if (freq <= 0 || baseHit <= 0 || durationMs <= 0) {
    return {
      hitDamage: baseHit,
      mitigationMult,
      autoAttackDps: 0,
      abilityDps: 0,
      totalDps: 0,
      hitsToKill: null,
      simDurationMs: durationMs,
      simIterations: 0,
    };
  }

  const attackIntervalMs = 1000 / freq;
  let totalDamage = 0;
  let hits = 0;
  let t = 0;

  while (t < durationMs) {
    const variance = 0.9 + Math.random() * 0.2;
    let hit = baseHit * variance;

    if (source.crit && Math.random() < source.crit / 100) {
      let critMult = 2;
      if (source.critdamage) critMult += source.critdamage / 100;
      hit *= critMult;
    }

    totalDamage += hit;
    hits += 1;
    t += attackIntervalMs;
  }

  const autoAttackDps = totalDamage / (durationMs / 1000);

  let hitsToKill: number | null = null;
  if (target.hp != null && target.hp > 0 && baseHit > 0) {
    hitsToKill = Math.ceil(target.hp / baseHit);
  }

  return {
    hitDamage: baseHit,
    mitigationMult,
    autoAttackDps,
    abilityDps: 0,
    totalDps: autoAttackDps,
    hitsToKill,
    simDurationMs: durationMs,
    simIterations: hits,
  };
}

/** Formulation + ability uplift (phase 2). */
export function estimateTotalDps(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  G: CustomGData,
  gear: { [slot in SlotType]?: ItemInfo },
  options?: TotalDpsOptions,
): DpsBreakdown {
  if (options?.mode === "event") {
    const timeline = simulateAutoAttackTimeline(source, target, options);
    const abilities = collectGearAbilities(gear, G, options?.classKey);
    const { abilityDps, lines } = estimateAbilityDps(source, target, abilities);
    const unsimulatedEffects = collectUnsimulatedOnHitEffects(
      gear,
      G,
      options?.classKey,
      source.damage_type,
    );
    return {
      ...timeline,
      abilityDps,
      abilityLines: lines,
      unsimulatedEffects: unsimulatedEffects.length > 0 ? unsimulatedEffects : undefined,
      totalDps: timeline.autoAttackDps + abilityDps,
    };
  }

  const { damage: hitDamage, mitigationMult } = estimateHitDamage(source, target, options);
  const freq = source.frequency ?? 0;
  const autoAttackDps = hitDamage * freq;

  const abilities = collectGearAbilities(gear, G, options?.classKey);
  const { abilityDps, lines } = estimateAbilityDps(source, target, abilities);
  const unsimulatedEffects = collectUnsimulatedOnHitEffects(
    gear,
    G,
    options?.classKey,
    source.damage_type,
  );
  const totalDps = autoAttackDps + abilityDps;

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
    unsimulatedEffects: unsimulatedEffects.length > 0 ? unsimulatedEffects : undefined,
    totalDps,
    hitsToKill,
  };
}
