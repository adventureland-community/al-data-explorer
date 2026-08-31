export type { CombatEntity, CombatSimOptions, DamageType, DpsBreakdown } from "./types";
export { applyItemStats, type PlayerStatBucket } from "./applyItemStats";
export { damageMultiplier, mitigationMultiplier } from "./damageMultiplier";
export { estimateHitDamage } from "./estimateHitDamage";
export { estimateAutoAttackDps, theoDps } from "./estimateAutoAttackDps";
export {
  collectGearAbilities,
  collectSplashIntensities,
  collectUnsimulatedOnHitEffects,
  estimateAbilityDps,
} from "./estimateAbilityDps";
export {
  abilityBonusOnProc,
  abilityProcRate,
  applyBurnProc,
  collectSplashHitStats,
  rollAbilityProcsOnHit,
  tickBurnDoTs,
  totalSplashPerHit,
} from "./abilityProc";
export {
  burnTickDamage,
  burnTotalDamageFromProc,
  effectiveFrequencyWithSugarrush,
} from "./conditionModel";
export {
  buildSustainLines,
  evasionHitFactor,
  onHitSustain,
  rogueStackDpsBoost,
  targetFortitudeMult,
} from "./hitModifiers";
export {
  estimateTotalDps,
  simulateAutoAttackTimeline,
  simulateCombatTimeline,
  type TotalDpsMode,
  type TotalDpsOptions,
} from "./estimateTotalDps";
export {
  defaultMatrixGear,
  matrixItemAtLevel,
  monsterToCombatEntity,
  resolveCombatStatsFromLoadout,
  resolveCombatStatsWithSwap,
  type ResolvedCombatStats,
} from "./resolveCombatStats";
export {
  canClassEquipItem,
  computeMatrixItemSim,
  getItemSimEquipNotes,
  type ItemSimEquipNote,
  type MatrixItemSimResult,
  type MatrixSimScope,
} from "./itemSimContext";
export { estimateStatWeights, type StatWeightLine } from "./estimateStatWeights";
