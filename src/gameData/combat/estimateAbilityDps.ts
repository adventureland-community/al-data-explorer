import { GItem, ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { getItemClassList } from "../itemMeta";
import { resolveItemInstanceStats } from "../itemProperties";
import { abilityBonusOnProc, abilityProcRate } from "./abilityProc";
import { mitigationMultiplier } from "./damageMultiplier";
import type { CombatEntity } from "./types";

export type GearAbility = {
  key: string;
  attr0: number;
  attr1?: number;
  unlimited?: boolean;
};

const PROC_ABILITIES = new Set(["burn", "poison", "freeze", "bash", "sugarrush"]);

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
 * Rough ability DPS uplift from on-hit procs and DoTs.
 * Uses expected proc rate × estimated bonus — not a full condition sim.
 */
export function estimateAbilityDps(
  source: CombatEntity,
  _target: Pick<CombatEntity, "armor" | "resistance">,
  abilities: Record<string, GearAbility>,
): { abilityDps: number; lines: { key: string; label: string; dps: number; detail?: string }[] } {
  const freq = source.frequency ?? 0;
  if (freq <= 0 || source.attack <= 0) {
    return { abilityDps: 0, lines: [] };
  }

  const lines: { key: string; label: string; dps: number; detail?: string }[] = [];
  let abilityDps = 0;

  for (const ability of Object.values(abilities)) {
    if (!PROC_ABILITIES.has(ability.key) || ability.attr0 <= 0) continue;

    const procRate = abilityProcRate(ability);
    const hitDamage = source.attack * (mitigationMultiplier(source, _target) || 1);
    const bonusPerProc = abilityBonusOnProc(ability, hitDamage > 0 ? hitDamage : source.attack);

    const dps = freq * procRate * bonusPerProc;
    if (dps > 0) {
      lines.push({
        key: ability.key,
        label: ability.key,
        dps,
        detail: `${ability.attr0}% proc · ~${bonusPerProc.toFixed(0)} dmg/proc`,
      });
      abilityDps += dps;
    }
  }

  return { abilityDps, lines };
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

/** @deprecated Use collectSplashIntensities + splashTargetCount in estimateTotalDps. */
export function collectUnsimulatedOnHitEffects(
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  classKey?: string,
  damageType?: string,
  splashTargetCount = 0,
): { key: string; label: string; reason: string }[] {
  if (splashTargetCount > 0) return [];
  const rows = collectSplashIntensities(gear, G, classKey, damageType);
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    reason: "Splash damage to nearby targets — set nearby count > 0 to include.",
  }));
}
