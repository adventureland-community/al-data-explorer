import {
  avoidanceHitFactor,
  evasionHitFactor,
  incDmgAmpMult,
  missHitFactor,
  targetFortitudeMult,
} from "./hitModifiers";
import { mitigationMultiplier } from "./damageMultiplier";
import type { CombatEntity, CombatSimOptions } from "./types";

export type HitDamageTarget = Pick<
  CombatEntity,
  "armor" | "resistance" | "evasion" | "for" | "firesistance" | "avoidance" | "incdmgamp"
>;

/** Expected damage for one auto-attack (formulation; optional expected crit uplift). */
export function estimateHitDamage(
  source: CombatEntity,
  target: HitDamageTarget,
  options?: CombatSimOptions & { attackerIsPlayer?: boolean },
): { damage: number; mitigationMult: number; evasionFactor: number; forMult: number } {
  const mitigationMult = mitigationMultiplier(source, target);
  const evasionFactor =
    options?.expectedEvasion === false
      ? 1
      : evasionHitFactor(source, target, options?.attackerIsPlayer !== false);
  const forMult = targetFortitudeMult(target, options?.attackerIsPlayer !== false);
  const missFactor = options?.expectedEvasion === false ? 1 : missHitFactor(source);
  const avoidFactor = options?.expectedEvasion === false ? 1 : avoidanceHitFactor(target);
  const ampMult = incDmgAmpMult(target);

  let damage =
    mitigationMult * source.attack * evasionFactor * forMult * missFactor * avoidFactor * ampMult;

  const useCrit = options?.expectedCrit !== false;
  if (useCrit && source.crit) {
    const critMult = 2 + (source.critdamage ?? 0) / 100;
    damage *= 1 + (source.crit / 100) * (critMult - 1);
  }

  return { damage, mitigationMult, evasionFactor, forMult };
}
