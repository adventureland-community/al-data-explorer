import { damageMultiplier } from "./damageMultiplier";
import type { CombatEntity } from "./types";

export type HitTarget = Pick<
  CombatEntity,
  "armor" | "resistance" | "evasion" | "for" | "firesistance"
>;

/** Server caps player evasion at 50; monsters use raw value. */
export function evasionHitFactor(
  source: Pick<CombatEntity, "damage_type">,
  target: HitTarget,
  sourceIsPlayer = true,
): number {
  if (source.damage_type !== "physical") return 1;
  const evasion = target.evasion ?? 0;
  if (evasion <= 0) return 1;
  const capped = sourceIsPlayer ? Math.min(50, evasion) : evasion;
  return 1 - capped / 100;
}

/** Player vs target with FOR stat (server: damage_multiplier(target.for * 5)). */
export function targetFortitudeMult(target: HitTarget, attackerIsPlayer = true): number {
  if (!attackerIsPlayer || !target.for || target.for <= 0) return 1;
  return damageMultiplier(target.for * 5);
}

/** Burn intensity scale from target fire resistance. */
export function burnResistanceScale(target: HitTarget): number {
  const res = target.firesistance ?? 0;
  return Math.max(0, 1 - res / 100);
}

/** Lifesteal / manasteal per hit (server: ceil(min(attack, target.hp) * pct / 100)). */
export function onHitSustain(
  source: Pick<CombatEntity, "lifesteal" | "manasteal">,
  hitDamage: number,
  targetHp?: number,
): { lifestealHp: number; manastealMp: number } {
  const cap = targetHp != null && targetHp > 0 ? Math.min(hitDamage, targetHp) : hitDamage;
  const lifestealHp =
    source.lifesteal && source.lifesteal > 0 ? Math.ceil((cap * source.lifesteal) / 100) : 0;
  const manastealMp =
    source.manasteal && source.manasteal > 0 ? Math.ceil((cap * source.manasteal) / 100) : 0;
  return { lifestealHp, manastealMp };
}

/** Rogue passive: attack gains +stack on each hit (capped). */
export const ROGUE_STACK_MAX = 2000;

export function rogueStackBonusAtHit(hitIndex: number): number {
  if (hitIndex <= 0) return 0;
  return Math.min(ROGUE_STACK_MAX, hitIndex);
}

/** Average rogue stack bonus over n consecutive hits. */
export function averageRogueStackBonus(hitCount: number): number {
  if (hitCount <= 0) return 0;
  const n = Math.min(ROGUE_STACK_MAX, hitCount);
  return (n + 1) / 2;
}

export function buildSustainLines(
  source: Pick<CombatEntity, "lifesteal" | "manasteal">,
  hitDamage: number,
  frequency: number,
  targetHp?: number,
): { key: string; label: string; perSecond: number; detail: string }[] {
  const { lifestealHp, manastealMp } = onHitSustain(source, hitDamage, targetHp);
  const lines: { key: string; label: string; perSecond: number; detail: string }[] = [];
  if (lifestealHp > 0 && source.lifesteal) {
    lines.push({
      key: "lifesteal",
      label: "Lifesteal",
      perSecond: lifestealHp * frequency,
      detail: `${source.lifesteal}% of damage dealt`,
    });
  }
  if (manastealMp > 0 && source.manasteal) {
    lines.push({
      key: "manasteal",
      label: "Manasteal",
      perSecond: manastealMp * frequency,
      detail: `${source.manasteal}% of damage dealt`,
    });
  }
  return lines;
}

export function stunDebuffLine(
  source: Pick<CombatEntity, "stun" | "damage_type">,
): { key: string; label: string; detail: string } | null {
  if (!source.stun || source.stun <= 0 || source.damage_type !== "physical") return null;
  return {
    key: "stun",
    label: "Stun",
    detail: `${source.stun}% proc · 2s stun on target`,
  };
}

export function rogueStackDpsBoost(args: {
  classKey?: string;
  frequency: number;
  hitDamage: number;
  sourceAttack: number;
  simDurationMs: number;
}): { dps: number; detail: string } | null {
  if (args.classKey !== "rogue" || args.frequency <= 0 || args.hitDamage <= 0) return null;
  const hits = args.frequency * (args.simDurationMs / 1000);
  const avgBonus = averageRogueStackBonus(Math.floor(hits));
  const hitMult = args.hitDamage / Math.max(1, args.sourceAttack);
  const dps = avgBonus * hitMult * args.frequency;
  if (dps <= 0) return null;
  return {
    dps,
    detail: `~${avgBonus.toFixed(0)} bonus dmg/hit avg over ${Math.floor(hits)} hits`,
  };
}
