import { damageMultiplier } from "./damageMultiplier";
import {
  applyBurnProc,
  burnTotalDamageFromProc,
  classifyAbilityProc,
  tickBurnDoTs,
  type ActiveBurn,
} from "./conditionModel";
import type { CombatEntity } from "./types";
import type { GearAbility } from "./estimateAbilityDps";

const PROC_ABILITIES = new Set(["burn", "poison", "freeze", "bash", "sugarrush", "weave"]);

export function abilityProcRate(ability: GearAbility): number {
  return Math.min(1, ability.attr0 / 100);
}

/** @deprecated Use burnTotalDamageFromProc from conditionModel. */
export function abilityBonusOnProc(ability: GearAbility, hitDamage: number): number {
  if (ability.key === "burn") {
    return burnTotalDamageFromProc(hitDamage, { unlimited: ability.unlimited });
  }
  return 0;
}

export type ProcRollResult = {
  total: number;
  byKey: Record<string, number>;
  sugarrushProcs: number;
  debuffProcs: Record<string, number>;
};

/** Roll on-hit procs for one attack. */
export function rollAbilityProcsOnHit(
  hitDamage: number,
  abilities: Record<string, GearAbility>,
  rng: () => number = Math.random,
): ProcRollResult {
  const byKey: Record<string, number> = {};
  const debuffProcs: Record<string, number> = {};
  let total = 0;
  let sugarrushProcs = 0;

  for (const ability of Object.values(abilities)) {
    if (!PROC_ABILITIES.has(ability.key)) continue;
    if (ability.key !== "weave" && ability.attr0 <= 0) continue;
    if (ability.key !== "weave" && rng() >= abilityProcRate(ability)) continue;

    const outcome = classifyAbilityProc(ability, hitDamage);
    if (!outcome) continue;

    switch (outcome.kind) {
      case "burn": {
        const bonus = burnTotalDamageFromProc(hitDamage, { unlimited: ability.unlimited });
        byKey[ability.key] = (byKey[ability.key] ?? 0) + bonus;
        total += bonus;
        break;
      }
      case "sugarrush":
        sugarrushProcs += 1;
        break;
      case "debuff":
        debuffProcs[outcome.key] = (debuffProcs[outcome.key] ?? 0) + 1;
        break;
      default:
        break;
    }
  }

  return { total, byKey, sugarrushProcs, debuffProcs };
}

export type SplashHitStats = {
  key: string;
  label: string;
  intensity: number;
  damagePerTarget: number;
};

/** Splash per nearby target — server uses defense only (no piercing). */
export function collectSplashHitStats(
  source: Pick<CombatEntity, "damage_type">,
  target: Pick<CombatEntity, "armor" | "resistance">,
  intensities: { key: string; label: string; intensity: number }[],
): SplashHitStats[] {
  const defense = source.damage_type === "physical" ? target.armor ?? 0 : target.resistance ?? 0;
  const mult = damageMultiplier(defense);

  return intensities.map(({ key, label, intensity }) => ({
    key,
    label,
    intensity,
    damagePerTarget: (mult * intensity) / 100,
  }));
}

export function totalSplashPerHit(stats: SplashHitStats[]): number {
  return stats.reduce((sum, row) => sum + row.damagePerTarget, 0);
}

export { applyBurnProc, tickBurnDoTs, type ActiveBurn };
