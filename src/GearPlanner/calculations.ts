/**
 * Hit mitigation vs a target — ported from adventureland_mongodb.
 *
 * Curve: js/old_common_functions.js `damage_multiplier` [10/12/17].
 * Apply: node/server.js `commence_attack` + `complete_attack`.
 *
 * Gear pierce is counted twice on a basic attack: commence copies
 * attacker[pierce] into info[pierce], then complete subtracts both
 * attacker[pierce] and info[pierce]. See Discord
 * https://discord.com/channels/238332476743745536/238332476743745536/947945565046579270
 *
 * TODO: skill pierce bonuses (e.g. piercingshot info.apiercing = 500) — counted once via info
 * TODO: heal path uses ((def - pierce) / 2) half-effect, pierce only once
 * TODO: splash uses damage_multiplier(target[defense]) with no pierce
 * TODO: fortitude (for * 5) extra mult when attacker is a player
 * TODO: evasion / reflection RNG outcomes
 * TODO: mainhand damage_type override (item can change class default)
 * Status resists (pn/fire/fz/ph/st) are not hit mitigation — see statInsights.ts.
 */

export type DamageType = "physical" | "magical" | "pure";

export type Combatant = {
  damage_type?: string;
  attack?: number;
  armor?: number;
  resistance?: number;
  apiercing?: number;
  rpiercing?: number;
  frequency?: number;
  crit?: number;
  critdamage?: number;
  hp?: number;
};

export type MitigationBreakdown = {
  damageType: DamageType;
  defenseStat: "armor" | "resistance" | "none";
  pierceStat: "apiercing" | "rpiercing" | "none";
  defense: number;
  pierce: number;
  /** `defense - 2 * pierce` for physical/magical basic attacks; 0 for pure. */
  effectiveDefense: number;
  multiplier: number;
};

/** Upstream `damage_multiplier(defense)` — pass effective defense (may be negative). */
export function damageMultiplier(defense: number): number {
  return Math.min(
    1.32,
    Math.max(
      0.05,
      1 -
        (Math.max(0, Math.min(100, defense)) * 0.001 +
          Math.max(0, Math.min(100, defense - 100)) * 0.001 +
          Math.max(0, Math.min(100, defense - 200)) * 0.00095 +
          Math.max(0, Math.min(100, defense - 300)) * 0.0009 +
          Math.max(0, Math.min(100, defense - 400)) * 0.00082 +
          Math.max(0, Math.min(100, defense - 500)) * 0.0007 +
          Math.max(0, Math.min(100, defense - 600)) * 0.0006 +
          Math.max(0, Math.min(100, defense - 700)) * 0.0005 +
          Math.max(0, defense - 800) * 0.0004) +
        Math.max(0, Math.min(50, 0 - defense)) * 0.001 +
        Math.max(0, Math.min(50, -50 - defense)) * 0.00075 +
        Math.max(0, Math.min(50, -100 - defense)) * 0.0005 +
        Math.max(0, -150 - defense) * 0.00025,
    ),
  );
}

/** Basic-attack effective defense: `def - 2 * pierce` (live server 2× quirk). */
export function effectiveDefense(defense: number, pierce: number): number {
  return defense - 2 * pierce;
}

function resolveDamageType(source: Combatant): DamageType {
  const raw = source.damage_type;
  if (raw === "magical" || raw === "pure" || raw === "physical") return raw;
  return "physical";
}

/**
 * How much of `source`'s basic attack lands on `target` after armor/resist pierce.
 * Pure skips mitigation (multiplier 1).
 */
export function mitigationBreakdown(source: Combatant, target: Combatant): MitigationBreakdown {
  const damageType = resolveDamageType(source);

  if (damageType === "pure") {
    return {
      damageType,
      defenseStat: "none",
      pierceStat: "none",
      defense: 0,
      pierce: 0,
      effectiveDefense: 0,
      multiplier: 1,
    };
  }

  const defenseStat = damageType === "magical" ? "resistance" : "armor";
  const pierceStat = damageType === "magical" ? "rpiercing" : "apiercing";
  const defense = target[defenseStat] ?? 0;
  const pierce = source[pierceStat] ?? 0;
  const effective = effectiveDefense(defense, pierce);

  return {
    damageType,
    defenseStat,
    pierceStat,
    defense,
    pierce,
    effectiveDefense: effective,
    multiplier: damageMultiplier(effective),
  };
}

/** Mean hit damage (attack roll averages to 1.0) including expected crit contribution. */
export function expectedHitDamage(source: Combatant, target: Combatant): number {
  const { multiplier } = mitigationBreakdown(source, target);
  let damage = multiplier * (source.attack ?? 0);
  let critMult = 2;
  if (source.critdamage) critMult += source.critdamage / 100;
  if (source.crit) damage += damage * (source.crit / 100) * critMult;
  return damage;
}

/** Hit damage at the low/high ends of the 0.9–1.1 attack roll (no crit). */
export function hitDamageRange(
  source: Combatant,
  target: Combatant,
): { low: number; high: number } {
  const { multiplier } = mitigationBreakdown(source, target);
  const attack = source.attack ?? 0;
  return { low: attack * 0.9 * multiplier, high: attack * 1.1 * multiplier };
}

/** Theoretical DPS: expected hit × frequency. */
export function theo_dps(source: Combatant, target: Combatant): number {
  const freq = source.frequency ?? 0;
  return expectedHitDamage(source, target) * freq;
}

/** @deprecated Prefer `damageMultiplier` — kept for call sites that used the old name. */
export const damage_multiplier = damageMultiplier;
