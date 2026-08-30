import type { CombatEntity } from "./types";

/** Feed defense minus piercing; returns damage multiplier (ported from AL server). */
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

/** Mitigation multiplier for one hit (source vs target). Piercing counts double vs armor/resistance. */
export function mitigationMultiplier(
  source: Pick<CombatEntity, "damage_type" | "apiercing" | "rpiercing">,
  target: Pick<CombatEntity, "armor" | "resistance">,
): number {
  const dtype = source.damage_type;
  if (dtype === "pure") return 1;

  const piercing = dtype === "physical" ? source.apiercing ?? 0 : source.rpiercing ?? 0;
  const resistance = dtype === "physical" ? target.armor ?? 0 : target.resistance ?? 0;
  return damageMultiplier(resistance - 2 * piercing);
}
