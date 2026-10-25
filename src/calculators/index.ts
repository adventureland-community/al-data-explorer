/**
 * Public seam for upgrade / compound / craft / greed / shiny calculators.
 *
 * No React. Callers supply G item lookup, price tables, and chance tables.
 * Intended future npm package entry — keep this barrel the stable surface.
 */

// --- Primitives (keep out of playerItemDisplay / itemAffixes) ---
export { getItemGrade } from "../gameData/itemGrade";
export { itemAcceptsStatScroll } from "../gameData/statScroll";

// --- Prices ---
export type { OfferingKeyName, PriceTable, PrimingSpend } from "../gameData/upgradePrices";
export {
  COMPOUND_SCROLL_KEYS,
  defaultPriceTable,
  marketSellMinPrice,
  OFFERING_KEYS,
  offeringGradeFromKey,
  offeringKeyFromGrade,
  POLISH_MATERIAL_KEYS,
  primingSpend,
  pscrollQtyForGrade,
  PSCROLL_QTY_BY_GRADE,
  scrollKeyForCompound,
  scrollKeyForUpgrade,
  seedMissingPrices,
  STAT_SCROLL_PROXY_KEY,
  statScrollGraceUnitCost,
  unitPrice,
  UPGRADE_SCROLL_KEYS,
} from "../gameData/upgradePrices";

// --- Chance ---
export type {
  ChanceItem,
  ChanceResult,
  ChanceStackOpts,
  ChanceTables,
  ItemLookup,
  OfferingChoice,
} from "../gameData/upgradeChance";
export {
  applyLuckySlotChance,
  COMPOUND_BASE_CHANCES,
  getCompoundChance,
  getUpgradeChance,
  OFFERING_GRADES,
  UPGRADE_BASE_CHANCES,
} from "../gameData/upgradeChance";

// --- Stacks ---
export type {
  FailstackEntry,
  FailstackTable,
  PrimestackEntry,
  PrimestackTable,
  StackCostRow,
  StackTables,
} from "../gameData/upgradeStacks";
export {
  buildStackTables,
  failstackUnitCost,
  HELMET_BASE_COST_FALLBACK,
  HELMET_GRADES,
  MAX_FAILSTACK,
  MAX_PRIMESTACK,
  primingUnitCost,
  primestackUnitCost,
} from "../gameData/upgradeStacks";

// --- Upgrade / compound path ---
export type {
  CompoundPathPlan,
  CompoundPathStep,
  PlannerContext,
  ToolkitOptions,
  UpgradePathPlan,
  UpgradePathStep,
  UpgradeStepOverride,
  UpgradeStepStrategy,
} from "../gameData/upgradePath";
export {
  allowedUpgradeScrollGrades,
  BALANCED_NEAR_BEST_EV_FRAC_COMPOUND,
  BALANCED_NEAR_BEST_EV_FRAC_UPGRADE,
  clearUpgradeStacksCache,
  computeUpgradeStacks,
  maxToolkitScrollGrade,
  mergeUpgradeStepOverrides,
  pickCompoundRoute,
  planCompoundPath,
  planUpgradePath,
  planUpgradePathBestOdds,
  recommendUpgradeStepMaxChance,
  recomputeUpgradePlan,
  resolveCompoundStrategy,
  upgradeStepOverrideKey,
} from "../gameData/upgradePath";

// --- Summaries / materials / shrine / format ---
export type { MaterialLine, PlanSummaryStep } from "../gameData/upgradePathSummary";
export {
  expectedBaseCopies,
  foldExpectedBaseCopies,
  summarizeCompoundPlan,
  summarizeUpgradePlan,
} from "../gameData/upgradePathSummary";
export { expectedPlanShrineMs, shrineClickMs } from "../gameData/upgradePathShrine";
export {
  formatAttempts,
  formatChancePct,
  formatGold,
  formatShrineTime,
} from "../gameData/upgradePathFormat";

// --- Craft EV ---
export type {
  CraftCostIncomplete,
  CraftCostOk,
  CraftCostResult,
  CraftLeafLine,
} from "../gameData/craftCost";
export {
  craftCostToMaterialLines,
  craftExpectedCost,
  craftMaterialsForCopies,
  itemHasCraftRecipe,
  listUnresolvedCraftLeaves,
} from "../gameData/craftCost";

// --- Extras: shiny / side effects ---
export type {
  DarkTristoneEffect,
  EdgeBucketOdds,
  InactiveTitleNote,
  PlanSummaryBundle,
  PolishMaterialKey,
  ShinyPolishOption,
  SideEffectStep,
  SideEffectSummary,
} from "../gameData/upgradeSideEffects";
export {
  applyShinyPolishToSummary,
  BONUS_GRACE_CHANCE,
  BOOSTER_COMPOUND_CHANCE,
  BOOSTER_EXTRA_PROC,
  DARK_TRISTONE_CHANCE,
  EDGE_BUCKET,
  edgeBucketOdds,
  expectedBoosterExtras,
  expectedEdgeOutcomes,
  isBoosterItem,
  isWeaponItem,
  listShinyPolishOptions,
  pickShinyPolish,
  POLISH_MATERIALS,
  SHINY_SHRINE_MS,
  SHINY_VALUE_CHANCE_CAP,
  shinyPolishChance,
  summarizeUpgradeSideEffects,
} from "../gameData/upgradeSideEffects";

// --- Extras: greed farm ---
export type {
  GreedFarmInput,
  GreedFarmResult,
  GreedScrollCompareRow,
  GreedScrollKey,
} from "../gameData/greedFarm";
export {
  compareGreedKits,
  GREED_QUICK_PICKS,
  minGreedEligibleLevel,
  planGreedFarm,
  scrollGradeFromKey,
} from "../gameData/greedFarm";
