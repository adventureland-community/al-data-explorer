/** @deprecated Import from `gameData/combat` instead. */
import type { CombatEntity } from "../gameData/combat";
import { mitigationMultiplier } from "../gameData/combat";

export { damageMultiplier, estimateAutoAttackDps as theo_dps } from "../gameData/combat";

/** @deprecated Use mitigationMultiplier from gameData/combat. */
export function cur_mult(source: CombatEntity, target: Pick<CombatEntity, "armor" | "resistance">) {
  return mitigationMultiplier(source, target);
}
