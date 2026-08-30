export type { CombatEntity, CombatSimOptions, DamageType, DpsBreakdown } from "./types";
export { applyItemStats, type PlayerStatBucket } from "./applyItemStats";
export { damageMultiplier, mitigationMultiplier } from "./damageMultiplier";
export { estimateHitDamage } from "./estimateHitDamage";
export { estimateAutoAttackDps, theoDps } from "./estimateAutoAttackDps";
export { collectGearAbilities, estimateAbilityDps } from "./estimateAbilityDps";
export {
  estimateTotalDps,
  simulateAutoAttackTimeline,
  type TotalDpsMode,
  type TotalDpsOptions,
} from "./estimateTotalDps";
export {
  defaultMatrixGear,
  matrixItemAtLevel,
  monsterToCombatEntity,
  resolveCombatStatsFromLoadout,
  resolveCombatStatsWithSwap,
} from "./resolveCombatStats";
