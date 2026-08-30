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
    let critMult = 2;
    if (source.critdamage) critMult += source.critdamage / 100;
    damage += damage * (source.crit / 100) * critMult;
  }

  return { damage, mitigationMult };
}
