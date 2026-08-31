import { GItem, ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { getItemClassList } from "../itemMeta";
import { resolveItemInstanceStats } from "../itemProperties";
import { abilityProcRate } from "./abilityProc";
import {
  burnTotalDamageFromProc,
  classifyAbilityProc,
  effectiveFrequencyWithSugarrush,
  SUGARRUSH_DURATION_MS,
} from "./conditionModel";
import type { CombatEntity } from "./types";

export type GearAbility = {
  key: string;
  attr0: number;
  attr1?: number;
  unlimited?: boolean;
};

const KNOWN_PROC_ABILITIES = new Set(["burn", "poison", "freeze", "bash", "sugarrush"]);

/** Gather stacked ability attrs from equipped gear (mirrors server player.a merge). */
export function collectGearAbilities(
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  classKey?: string,
): Record<string, GearAbility> {
  const abilities: Record<string, GearAbility> = {};

  for (const itemInfo of Object.values(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name] as GItem | undefined;
    if (!gItem?.ability) continue;

    const prop = resolveItemInstanceStats({
      def: gItem,
      itemInfo,
      G,
      classKey,
    });

    const key = gItem.ability;
    const prev = abilities[key];
    abilities[key] = {
      key,
      attr0: (prev?.attr0 ?? 0) + ((prop as { attr0?: number }).attr0 ?? 0),
      attr1: (prev?.attr1 ?? 0) + ((prop as { attr1?: number }).attr1 ?? 0),
      unlimited: prev?.unlimited || Boolean((gItem as { unlimited?: boolean }).unlimited),
    };
  }

  return abilities;
}

/**
 * Ability DPS uplift from on-hit procs (burn DoT, sugarrush attack-speed buff).
 * Poison/freeze are debuffs on the target — listed separately, not counted in DPS.
 */
export function estimateAbilityDps(
  source: CombatEntity,
  _target: Pick<CombatEntity, "armor" | "resistance">,
  abilities: Record<string, GearAbility>,
  options?: { simDurationMs?: number },
): {
  abilityDps: number;
  lines: { key: string; label: string; dps: number; detail?: string }[];
  debuffLines: { key: string; label: string; detail: string }[];
} {
  const freq = source.frequency ?? 0;
  const simDurationMs = options?.simDurationMs ?? 30_000;
  if (freq <= 0 || source.attack <= 0) {
    return { abilityDps: 0, lines: [], debuffLines: [] };
  }

  const lines: { key: string; label: string; dps: number; detail?: string }[] = [];
  const debuffLines: { key: string; label: string; detail: string }[] = [];
  let abilityDps = 0;

  const hitDamage = source.attack;

  for (const ability of Object.values(abilities)) {
    if (!KNOWN_PROC_ABILITIES.has(ability.key) || ability.attr0 <= 0) continue;

    const procRate = abilityProcRate(ability);
    const outcome = classifyAbilityProc(ability, hitDamage);
    if (!outcome) continue;

    switch (outcome.kind) {
      case "burn": {
        const perProc = burnTotalDamageFromProc(hitDamage, { unlimited: ability.unlimited });
        const dps = freq * procRate * perProc;
        if (dps > 0) {
          lines.push({
            key: ability.key,
            label: ability.key,
            dps,
            detail: `${ability.attr0}% proc · ~${perProc.toFixed(0)} dmg/proc (DoT)`,
          });
          abilityDps += dps;
        }
        break;
      }
      case "sugarrush": {
        const boostedFreq = effectiveFrequencyWithSugarrush(freq, ability.attr0, simDurationMs);
        const extraAutoDps = hitDamage * (boostedFreq - freq);
        if (extraAutoDps > 0) {
          lines.push({
            key: ability.key,
            label: "sugarrush",
            dps: extraAutoDps,
            detail: `${ability.attr0}% proc · +${SUGARRUSH_DURATION_MS / 1000}s @ +240 frequency`,
          });
          abilityDps += extraAutoDps;
        }
        break;
      }
      case "debuff":
        debuffLines.push({
          key: outcome.key,
          label: outcome.label,
          detail: `${ability.attr0}% proc · ${outcome.detail}`,
        });
        break;
      default:
        break;
    }
  }

  return { abilityDps, lines, debuffLines };
}

/** Splash stats on gear — intensities for multi-target sim. */
export function collectSplashIntensities(
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  classKey?: string,
  damageType?: string,
): { key: string; label: string; intensity: number }[] {
  const rows: { key: string; label: string; intensity: number }[] = [];

  for (const itemInfo of Object.values(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name] as GItem | undefined;
    if (!gItem) continue;

    const prop = resolveItemInstanceStats({
      def: gItem,
      itemInfo,
      G,
      classKey,
    });

    const allowed = getItemClassList(gItem);
    if (allowed.length > 0 && classKey && !allowed.includes(classKey)) continue;

    const statProp = prop as Partial<Record<string, number>>;

    if (statProp.explosion && damageType === "physical") {
      rows.push({
        key: `explosion-${itemInfo.name}`,
        label: `Explosion ${statProp.explosion}%`,
        intensity: statProp.explosion,
      });
    }
    if (statProp.blast && damageType === "magical") {
      rows.push({
        key: `blast-${itemInfo.name}`,
        label: `Blast ${statProp.blast}%`,
        intensity: statProp.blast,
      });
    }
  }

  return rows;
}

const UNSIMULATED_ABILITY_REASONS: Record<string, string> = {
  weave: "Slow debuff on target — not single-target DPS",
  power: "Temporary attack-speed buff — use skills sim",
  xpower: "Temporary attack-speed buff — use skills sim",
  warp: "Movement ability — not DPS",
  poke: "Utility ability — not DPS",
  restore_mp: "Mana restore — not DPS",
  secondchance: "Survival proc on incoming damage — not outgoing DPS",
  tangle: "Movement slow — not DPS",
  zapperzap: "Monster ability — not player gear DPS",
  temporalsurge: "Buff ability — not modeled",
  charm: "Crowd control — not DPS",
  scare: "Crowd control — not DPS",
  shelter: "Defensive buff — not DPS",
  fanofknives: "Skill attack — not auto-attack DPS",
};

/** Gear abilities and splash not counted in single-target DPS. */
export function collectUnsimulatedOnHitEffects(
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  classKey?: string,
  damageType?: string,
  splashTargetCount = 0,
): { key: string; label: string; reason: string }[] {
  const rows: { key: string; label: string; reason: string }[] = [];
  const seen = new Set<string>();

  for (const itemInfo of Object.values(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name] as GItem | undefined;
    if (!gItem?.ability) continue;

    const allowed = getItemClassList(gItem);
    if (allowed.length > 0 && classKey && !allowed.includes(classKey)) continue;

    const key = gItem.ability;
    if (KNOWN_PROC_ABILITIES.has(key) || seen.has(key)) continue;
    seen.add(key);

    rows.push({
      key: `ability-${key}`,
      label: key,
      reason: UNSIMULATED_ABILITY_REASONS[key] ?? "Gear ability not yet modeled in DPS sim",
    });
  }

  if (splashTargetCount <= 0) {
    for (const row of collectSplashIntensities(gear, G, classKey, damageType)) {
      rows.push({
        key: row.key,
        label: row.label,
        reason: "Splash damage to nearby targets — set nearby count > 0 to include.",
      });
    }
  }

  return rows;
}
