import { estimateHitDamage } from "./estimateHitDamage";
import type { CombatEntity, CombatSimOptions, DpsBreakdown } from "./types";

/** Formulation-based auto-attack DPS (attack × frequency with mitigation + expected crit). */
export function estimateAutoAttackDps(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">,
  options?: CombatSimOptions,
): DpsBreakdown {
  const { damage: hitDamage, mitigationMult } = estimateHitDamage(source, target, options);
  const freq = source.frequency ?? 0;
  const autoAttackDps = hitDamage * freq;

  let hitsToKill: number | null = null;
  if (target.hp != null && target.hp > 0 && hitDamage > 0) {
    hitsToKill = Math.ceil(target.hp / hitDamage);
  }

  return {
    hitDamage,
    mitigationMult,
    autoAttackDps,
    abilityDps: 0,
    totalDps: autoAttackDps,
    hitsToKill,
  };
}

/** @deprecated Use estimateAutoAttackDps — kept for existing imports during migration. */
export function theoDps(
  source: CombatEntity,
  target: Pick<CombatEntity, "armor" | "resistance">,
): number {
  return estimateAutoAttackDps(source, target).autoAttackDps;
}
