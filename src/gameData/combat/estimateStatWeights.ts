import { ItemInfo, SlotType } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { LoadoutClassDef } from "../loadoutStats";
import { estimateTotalDps } from "./estimateTotalDps";
import { resolveCombatStatsFromLoadout } from "./resolveCombatStats";
import type { CombatEntity } from "./types";

export type StatWeightLine = {
  stat: string;
  label: string;
  dpsPerPoint: number;
  dpsPer10: number;
};

const MAIN_STATS = ["int", "str", "dex", "vit", "for"] as const;
const DIRECT_STATS: (keyof CombatEntity)[] = [
  "attack",
  "frequency",
  "apiercing",
  "rpiercing",
  "crit",
  "critdamage",
];

/**
 * Pawn-style marginal DPS weights via finite differences.
 * Main stats bump class sheet values; direct stats bump resolved combat entity.
 */
export function estimateStatWeights(args: {
  characterClass: LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
  target: Pick<CombatEntity, "armor" | "resistance" | "hp">;
  classKey?: string;
}): StatWeightLine[] {
  const { characterClass, level, gear, G, target, classKey } = args;
  const baseStats = resolveCombatStatsFromLoadout({ characterClass, level, gear, G });
  const baseDps = estimateTotalDps(baseStats, target, G, gear, { classKey }).totalDps;

  const lines: StatWeightLine[] = [];

  for (const stat of MAIN_STATS) {
    const current = baseStats[stat] ?? 0;
    const bumped = resolveCombatStatsFromLoadout({
      characterClass,
      level,
      gear,
      G,
      statOverrides: { [stat]: current + 1 },
    });
    const dps = estimateTotalDps(bumped, target, G, gear, { classKey }).totalDps;
    const gain = dps - baseDps;
    if (Math.abs(gain) > 0.001) {
      lines.push({
        stat,
        label: stat,
        dpsPerPoint: gain,
        dpsPer10: gain * 10,
      });
    }
  }

  for (const stat of DIRECT_STATS) {
    const current = (baseStats as CombatEntity)[stat as keyof CombatEntity];
    if (typeof current !== "number") continue;
    const bumpedEntity = {
      ...baseStats,
      [stat]: current + (stat === "frequency" ? 0.01 : stat === "crit" ? 1 : 1),
    };
    const dps = estimateTotalDps(bumpedEntity, target, G, gear, { classKey }).totalDps;
    const gain = dps - baseDps;
    if (Math.abs(gain) > 0.001) {
      const delta = stat === "frequency" ? 0.01 : 1;
      lines.push({
        stat,
        label: stat,
        dpsPerPoint: gain / delta,
        dpsPer10: (gain / delta) * 10,
      });
    }
  }

  return lines.sort((a, b) => b.dpsPer10 - a.dpsPer10);
}
