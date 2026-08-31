import { CustomGData } from "../../GDataContext";
import { estimateHitDamage, type HitDamageTarget } from "./estimateHitDamage";
import type { CombatEntity, CombatSimOptions } from "./types";

type SkillEntry = CustomGData["skills"][string];

function skillWtypeMatches(
  skillWtype: string | string[] | undefined,
  weaponWtype: string | undefined,
): boolean {
  if (!skillWtype) return true;
  if (!weaponWtype) return false;
  if (Array.isArray(skillWtype)) return skillWtype.includes(weaponWtype);
  return skillWtype === weaponWtype;
}

function multiTargetCount(skillKey: string, skill: SkillEntry, splashTargetCount: number): number {
  const maxTargets = skill.max_targets ?? (skillKey === "3shot" ? 3 : skillKey === "5shot" ? 5 : 1);
  if (maxTargets <= 1) return 1;
  return 1 + Math.min(maxTargets - 1, Math.max(0, splashTargetCount));
}

function swingDamageForSkill(
  skillKey: string,
  skill: SkillEntry,
  source: CombatEntity,
  target: HitDamageTarget,
  splashTargetCount: number,
  simOptions?: CombatSimOptions,
): number {
  const mult = skill.damage_multiplier ?? 1;
  const skillSource: CombatEntity = { ...source };

  if (skill.damage_type) {
    skillSource.damage_type = skill.damage_type as CombatEntity["damage_type"];
  }
  if (skill.apiercing) {
    skillSource.apiercing = (source.apiercing ?? 0) + skill.apiercing;
  }

  const { damage: baseHit } = estimateHitDamage(skillSource, target, simOptions);
  const targets = multiTargetCount(skillKey, skill, splashTargetCount);
  return baseHit * mult * targets;
}

export type ResolvedAutoSwing = {
  perSwingDamage: number;
  mitigationMult: number;
  skillKey?: string;
  skillLabel?: string;
  skillDetail?: string;
};

/**
 * Pick the best damage per attack swing: plain auto or an attack-share skill
 * (piercingshot, 3shot, fanofknives, etc.) that shares the attack cooldown.
 */
export function resolveBestAutoSwing(
  source: CombatEntity,
  target: HitDamageTarget,
  G: CustomGData,
  options: {
    classKey: string;
    playerLevel: number;
    mainhandWtype?: string;
    splashTargetCount?: number;
    simOptions?: CombatSimOptions;
  },
): ResolvedAutoSwing {
  const { classKey, playerLevel, mainhandWtype, splashTargetCount = 0, simOptions } = options;
  const plain = estimateHitDamage(source, target, simOptions);

  let best: ResolvedAutoSwing = {
    perSwingDamage: plain.damage,
    mitigationMult: plain.mitigationMult,
  };

  for (const [key, skill] of Object.entries(G.skills)) {
    if (skill.share !== "attack") continue;
    if (skill.heal) continue;
    if (!skill.class?.includes(classKey)) continue;
    if (skill.level != null && skill.level > playerLevel) continue;
    if (!skillWtypeMatches(skill.wtype, mainhandWtype)) continue;
    if (!skill.damage_multiplier && !skill.apiercing) continue;

    const swing = swingDamageForSkill(key, skill, source, target, splashTargetCount, simOptions);
    if (swing <= best.perSwingDamage) continue;

    const targets = multiTargetCount(key, skill, splashTargetCount);
    const mult = skill.damage_multiplier ?? 1;
    const targetNote = targets > 1 ? ` · ${targets} targets` : "";
    const pierceNote = skill.apiercing ? ` · +${skill.apiercing} AP` : "";

    best = {
      perSwingDamage: swing,
      mitigationMult: plain.mitigationMult,
      skillKey: key,
      skillLabel: skill.name ?? key,
      skillDetail: `${mult}× attack${pierceNote}${targetNote} (replaces autos)`,
    };
  }

  return best;
}
