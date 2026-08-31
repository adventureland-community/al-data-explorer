import type { CombatEntity } from "./types";
import type { GearAbility } from "./estimateAbilityDps";
import { mitigationMultiplier } from "./damageMultiplier";

const PROC_ABILITIES = new Set(["burn", "poison", "freeze", "bash", "sugarrush"]);

/** Estimated bonus damage when an on-hit ability procs (uses actual hit damage when provided). */
export function abilityBonusOnProc(ability: GearAbility, hitDamage: number): number {
  if (ability.attr0 <= 0 || hitDamage <= 0) return 0;

  switch (ability.key) {
    case "burn": {
      const tickDamage = Math.ceil(hitDamage / 5);
      return tickDamage * 6 * (ability.unlimited ? 1.15 : 1);
    }
    case "poison":
      return Math.ceil(hitDamage / 8) * 4;
    case "freeze":
      return 10 * ability.attr0 * ability.attr0;
    case "bash":
      return hitDamage * 0.15;
    case "sugarrush":
      return hitDamage * 0.25;
    default:
      return 0;
  }
}

export function abilityProcRate(ability: GearAbility): number {
  return Math.min(1, ability.attr0 / 100);
}

/** Roll on-hit procs for one attack; returns total bonus damage and per-ability totals. */
export function rollAbilityProcsOnHit(
  hitDamage: number,
  abilities: Record<string, GearAbility>,
  rng: () => number = Math.random,
): { total: number; byKey: Record<string, number> } {
  const byKey: Record<string, number> = {};
  let total = 0;

  for (const ability of Object.values(abilities)) {
    if (!PROC_ABILITIES.has(ability.key) || ability.attr0 <= 0) continue;
    if (rng() >= abilityProcRate(ability)) continue;
    const bonus = abilityBonusOnProc(ability, hitDamage);
    if (bonus <= 0) continue;
    byKey[ability.key] = (byKey[ability.key] ?? 0) + bonus;
    total += bonus;
  }

  return { total, byKey };
}

export type SplashHitStats = {
  key: string;
  label: string;
  intensity: number;
  damagePerTarget: number;
};

/** Splash damage per nearby target per auto-attack (server splash formula). */
export function collectSplashHitStats(
  source: Pick<CombatEntity, "damage_type" | "apiercing" | "rpiercing">,
  target: Pick<CombatEntity, "armor" | "resistance">,
  intensities: { key: string; label: string; intensity: number }[],
): SplashHitStats[] {
  const mult = mitigationMultiplier(source, target);

  return intensities.map(({ key, label, intensity }) => ({
    key,
    label,
    intensity,
    damagePerTarget: mult * (intensity / 100),
  }));
}

export function totalSplashPerHit(stats: SplashHitStats[]): number {
  return stats.reduce((sum, row) => sum + row.damagePerTarget, 0);
}
