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
 * Skill pierce (e.g. piercingshot `info.apiercing = 500`) is counted once via info.
 * Heal: `damage_multiplier((def - pierce) / 2)` with pierce once.
 * Splash: `damage_multiplier(def)` with no pierce.
 * Fortitude: player→target with `for` multiplies by `damage_multiplier(for * 5)`.
 * Evasion (physical) / reflection (magical) gate whether the hit lands.
 * Status resists (pn/fire/fz/ph/st) are not hit mitigation — see statInsights.ts.
 */

export type DamageType = "physical" | "magical" | "pure";

export type HitPath = "basic" | "heal" | "splash";

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
  /** Fortitude attribute on the defender (player or monster). */
  for?: number;
  evasion?: number;
  reflection?: number;
};

export type MitigationOptions = {
  /** Extra pierce on `info` only (skill) — counted once, not doubled. */
  skillPierce?: number;
  path?: HitPath;
  /** When true, apply fortitude mult if the target has `for`. */
  attackerIsPlayer?: boolean;
};

export type MitigationBreakdown = {
  damageType: DamageType;
  path: HitPath;
  defenseStat: "armor" | "resistance" | "none";
  pierceStat: "apiercing" | "rpiercing" | "none";
  defense: number;
  /** Gear pierce (attacker sheet). */
  pierce: number;
  skillPierce: number;
  /** Defense fed into `damage_multiplier` after pierce rules for this path. */
  effectiveDefense: number;
  multiplier: number;
  fortitudeMult: number;
  /** Chance the hit is fully negated (evasion or reflection). */
  missChance: number;
  /** Expected fraction of hits that deal damage: 1 − missChance/100. */
  landChance: number;
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

/**
 * Resolve outbound damage type: mainhand `damage_type` wins over class default.
 * `heal` weapons (e.g. cupid) are treated as magical for resist/pierce pairing;
 * use `path: "heal"` for the heal half-defense formula.
 */
export function resolveDamageType(
  source: Combatant,
  mainhandDamageType?: string | null,
): DamageType {
  const raw = mainhandDamageType || source.damage_type;
  if (raw === "heal" || raw === "magical") return "magical";
  if (raw === "pure" || raw === "physical") return raw;
  return "physical";
}

function mitigationPair(damageType: DamageType): {
  defenseStat: "armor" | "resistance" | "none";
  pierceStat: "apiercing" | "rpiercing" | "none";
} {
  if (damageType === "pure") return { defenseStat: "none", pierceStat: "none" };
  if (damageType === "magical") {
    return { defenseStat: "resistance", pierceStat: "rpiercing" };
  }
  return { defenseStat: "armor", pierceStat: "apiercing" };
}

/**
 * How much of `source`'s hit lands on `target` after armor/resist pierce.
 */
export function mitigationBreakdown(
  source: Combatant,
  target: Combatant,
  options: MitigationOptions = {},
): MitigationBreakdown {
  const path = options.path ?? "basic";
  const skillPierce = Math.max(0, options.skillPierce ?? 0);
  const damageType = resolveDamageType(source);

  if (damageType === "pure" && path !== "heal" && path !== "splash") {
    return {
      damageType,
      path,
      defenseStat: "none",
      pierceStat: "none",
      defense: 0,
      pierce: 0,
      skillPierce: 0,
      effectiveDefense: 0,
      multiplier: 1,
      fortitudeMult: 1,
      missChance: 0,
      landChance: 1,
    };
  }

  const pairType: DamageType =
    path === "heal" ? "magical" : damageType === "pure" ? "physical" : damageType;
  const { defenseStat, pierceStat } = mitigationPair(pairType);
  const defense = defenseStat === "none" ? 0 : target[defenseStat] ?? 0;
  const pierce = pierceStat === "none" ? 0 : source[pierceStat] ?? 0;

  let effective: number;
  let multiplier: number;
  if (path === "splash") {
    effective = defense;
    multiplier = damageMultiplier(defense);
  } else if (path === "heal") {
    // Heal: pierce once, half the remaining defense.
    effective = (defense - pierce) / 2;
    multiplier = damageMultiplier(effective);
  } else {
    // Basic: gear pierce doubled + skill pierce once.
    effective = defense - 2 * pierce - skillPierce;
    multiplier = damageMultiplier(effective);
  }

  const fortitudeMult =
    options.attackerIsPlayer && (target.for ?? 0) > 0 ? damageMultiplier((target.for ?? 0) * 5) : 1;

  let missChance = 0;
  if (path === "basic" && damageType === "physical") {
    missChance = Math.max(0, Math.min(100, target.evasion ?? 0));
  } else if (path === "basic" && damageType === "magical") {
    missChance = Math.max(0, Math.min(100, target.reflection ?? 0));
  }

  return {
    damageType,
    path,
    defenseStat,
    pierceStat,
    defense,
    pierce,
    skillPierce,
    effectiveDefense: effective,
    multiplier,
    fortitudeMult,
    missChance,
    landChance: 1 - missChance / 100,
  };
}

/** Mean hit damage including crit EV, fortitude, and evade/reflect land chance. */
export function expectedHitDamage(
  source: Combatant,
  target: Combatant,
  options: MitigationOptions = {},
): number {
  const b = mitigationBreakdown(source, target, options);
  let damage = b.multiplier * b.fortitudeMult * (source.attack ?? 0);
  let critMult = 2;
  if (source.critdamage) critMult += source.critdamage / 100;
  if (source.crit) damage += damage * (source.crit / 100) * critMult;
  return damage * b.landChance;
}

/** Hit damage at the low/high ends of the 0.9–1.1 attack roll (no crit; before land chance). */
export function hitDamageRange(
  source: Combatant,
  target: Combatant,
  options: MitigationOptions = {},
): { low: number; high: number } {
  const b = mitigationBreakdown(source, target, options);
  const attack = source.attack ?? 0;
  const scale = b.multiplier * b.fortitudeMult * b.landChance;
  return { low: attack * 0.9 * scale, high: attack * 1.1 * scale };
}

/** Theoretical DPS: expected hit × frequency. */
export function theo_dps(
  source: Combatant,
  target: Combatant,
  options: MitigationOptions = {},
): number {
  const freq = source.frequency ?? 0;
  return expectedHitDamage(source, target, options) * freq;
}

/** @deprecated Prefer `damageMultiplier` — kept for call sites that used the old name. */
export const damage_multiplier = damageMultiplier;
