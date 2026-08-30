import { GItem, ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { getItemClassList } from "../itemMeta";
import { resolveItemInstanceStats } from "../itemProperties";
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

    const procRate = Math.min(1, ability.attr0 / 100);
    let bonusPerProc = 0;

    switch (ability.key) {
      case "burn": {
        // Burn DoT ticks ceil(intensity/5); intensity ≈ hit damage. ~6 ticks over ~3s simplified.
        const tickDamage = Math.ceil(source.attack / 5);
        bonusPerProc = tickDamage * 6 * (ability.unlimited ? 1.15 : 1);
        break;
      }
      case "poison": {
        bonusPerProc = Math.ceil(source.attack / 8) * 4;
        break;
      }
      case "freeze": {
        // Server adds 10 * attr0² on freeze proc hits.
        bonusPerProc = 10 * ability.attr0 * ability.attr0;
        break;
      }
      case "bash":
        bonusPerProc = source.attack * 0.15;
        break;
      case "sugarrush":
        bonusPerProc = source.attack * 0.25;
        break;
      default:
        bonusPerProc = 0;
    }

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

/** Splash stats on gear — shown in breakdown but not single-target DPS. */
export function collectUnsimulatedOnHitEffects(
  gear: { [slot in SlotType]?: ItemInfo },
  G: CustomGData,
  classKey?: string,
  damageType?: string,
): { key: string; label: string; reason: string }[] {
  const effects: { key: string; label: string; reason: string }[] = [];

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
      effects.push({
        key: `explosion-${itemInfo.name}`,
        label: `Explosion ${statProp.explosion}%`,
        reason: "Splash damage to nearby targets — not counted vs a single mob.",
      });
    }
    if (statProp.blast && damageType === "magical") {
      effects.push({
        key: `blast-${itemInfo.name}`,
        label: `Blast ${statProp.blast}%`,
        reason: "Splash damage to nearby targets — not counted vs a single mob.",
      });
    }
  }

  return effects;
}
