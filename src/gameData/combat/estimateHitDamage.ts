import { mitigationMultiplier } from "./damageMultiplier";
import type { CombatEntity, CombatSimOptions } from "./types";

/** Expected damage for one auto-attack (formulation; optional expected crit uplift). */
export function estimateHitDamage(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance">,
  options?: CombatSimOptions,
): { damage: number; mitigationMult: number } {
  const mitigationMult = mitigationMultiplier(source, target);
  let damage = mitigationMult * source.attack;

  const useCrit = options?.expectedCrit !== false;
  if (useCrit && source.crit) {
    const critMult = 2 + (source.critdamage ?? 0) / 100;
    // Server: crit multiplies pre-mitigation attack, then mitigation applies.
    damage *= 1 + (source.crit / 100) * (critMult - 1);
  }

  return { damage, mitigationMult };
}
