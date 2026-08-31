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

function pickQuickFillerSkill(
  skills: [string, SkillEntry][],
  mainhandWtype: string | undefined,
): [string, SkillEntry] | null {
  const fillers = skills.filter(
    ([, s]) => s.share === "quickpunch" && s.damage_multiplier && s.cooldown,
  );
  if (fillers.length === 0) return null;
  const match = fillers.find(([, s]) => skillWtypeMatches(s.wtype, mainhandWtype));
  return match ?? null;
}

function skillLineFromRatio(
  key: string,
  skill: SkillEntry,
  target: HitDamageTarget,
  playerMp: number,
  simOptions?: CombatSimOptions,
): { key: string; label: string; dps: number; detail?: string } | null {
  const { ratio } = skill;
  const cooldownMs = skill.cooldown;
  if (!ratio || !cooldownMs || cooldownMs <= 0 || playerMp <= 0) return null;

  const mpCost = skill.mp ?? 0;
  if (mpCost > playerMp) return null;

  const channelMp = key === "cburst" ? playerMp : playerMp;
  const rawDamage = channelMp * ratio;
  const attacker: CombatEntity = {
    attack: rawDamage,
    frequency: 0,
    damage_type: (skill.damage_type ?? "pure") as CombatEntity["damage_type"],
  };
  const { damage: mitigated } = estimateHitDamage(attacker, target, simOptions);
  const usesPerSec = 1000 / cooldownMs;
  const dps = mitigated * usesPerSec;
  if (dps <= 0) return null;

  return {
    key: `skill:${key}`,
    label: skill.name ?? key,
    dps,
    detail: `${channelMp.toFixed(0)} MP × ${ratio} · ${(cooldownMs / 1000).toFixed(1)}s cd`,
  };
}

function skillLineFromDef(
  key: string,
  skill: SkillEntry,
  source: CombatEntity,
  target: HitDamageTarget,
  playerMp?: number,
  simOptions?: CombatSimOptions,
): { key: string; label: string; dps: number; detail?: string } | null {
  const mpCost = skill.mp ?? 0;
  if (mpCost > 0 && playerMp != null && mpCost > playerMp) return null;

  const mult = skill.damage_multiplier;
  const cooldownMs = skill.cooldown;
  if (!mult || !cooldownMs || cooldownMs <= 0) return null;

  const skillSource: CombatEntity = skill.damage_type
    ? { ...source, damage_type: skill.damage_type as CombatEntity["damage_type"] }
    : source;

  const { damage: hitDamage } = estimateHitDamage(skillSource, target, simOptions);
  const perHit = hitDamage * mult;
  const usesPerSec = 1000 / cooldownMs;
  const dps = perHit * usesPerSec;
  if (dps <= 0) return null;

  const procNote = skill.procs ? " · procs gear" : "";
  return {
    key: `skill:${key}`,
    label: skill.name ?? key,
    dps,
    detail: `${mult}× · ${(cooldownMs / 1000).toFixed(2)}s cd · ~${usesPerSec.toFixed(
      2,
    )}/s${procNote}`,
  };
}

/** Expected DPS from class skills (quickstab, smash, supershot, mentalburst, etc.). */
export function estimateSkillRotationDps(
  source: CombatEntity,
  target: HitDamageTarget,
  G: CustomGData,
  options: {
    classKey: string;
    playerLevel: number;
    mainhandWtype?: string;
    playerMp?: number;
    simOptions?: CombatSimOptions;
  },
): {
  skillDps: number;
  lines: { key: string; label: string; dps: number; detail?: string }[];
  unsimulated: { key: string; label: string; reason: string }[];
} {
  const { classKey, playerLevel, mainhandWtype, playerMp, simOptions } = options;
  const lines: { key: string; label: string; dps: number; detail?: string }[] = [];
  const unsimulated: { key: string; label: string; reason: string }[] = [];

  const classSkills = Object.entries(G.skills).filter(
    ([, skill]) =>
      skill.type === "skill" &&
      skill.class?.includes(classKey) &&
      skill.hostile &&
      (skill.level == null || skill.level <= playerLevel),
  ) as [string, SkillEntry][];

  const handledShareGroups = new Set<string>();

  const quickFiller = pickQuickFillerSkill(classSkills, mainhandWtype);
  if (quickFiller) {
    handledShareGroups.add("quickpunch");
    const [key, skill] = quickFiller;
    const line = skillLineFromDef(key, skill, source, target, playerMp, simOptions);
    if (line) lines.push(line);
  }

  for (const [key, skill] of classSkills) {
    if (skill.ratio && skill.cooldown) {
      const ratioLine = skillLineFromRatio(key, skill, target, playerMp ?? 0, simOptions);
      if (ratioLine) lines.push(ratioLine);
      continue;
    }

    if (!skill.damage_multiplier) continue;
    if (skill.share === "quickpunch") continue;
    if (skill.share && handledShareGroups.has(skill.share)) continue;

    if (skill.multi || skill.max_targets) {
      if (skill.share === "attack") continue;
      unsimulated.push({
        key: `skill:${key}`,
        label: skill.name ?? key,
        reason: "Multi-target skill — single-target DPS not modeled",
      });
      continue;
    }

    if (skill.share === "attack" || skill.apiercing) {
      if (skill.share === "attack") continue;
      unsimulated.push({
        key: `skill:${key}`,
        label: skill.name ?? key,
        reason: skill.apiercing
          ? "Armor-piercing attack skill — use attack-share rotation (not modeled)"
          : "Attack-share skill — may replace autos (not modeled)",
      });
      continue;
    }

    if (!skillWtypeMatches(skill.wtype, mainhandWtype)) continue;

    const cooldownMs = skill.cooldown;
    if (!cooldownMs || cooldownMs <= 0) continue;

    const line = skillLineFromDef(key, skill, source, target, playerMp, simOptions);
    if (line) lines.push(line);
  }

  const skillDps = lines.reduce((sum, row) => sum + row.dps, 0);
  return { skillDps, lines, unsimulated };
}
