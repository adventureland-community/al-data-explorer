import { estimateHitDamage } from "./estimateHitDamage";
import { incomingReflectionFactor } from "./hitModifiers";
import type { CombatEntity, DpsBreakdown } from "./types";

export type IncomingDpsBreakdown = DpsBreakdown & {
  evasionFactor: number;
  reflectionFactor: number;
  secondsToDeath: number | null;
};

/** Monster auto-attack DPS against a player loadout (incoming damage). */
export function estimateIncomingDps(
  monster: CombatEntity,
  player: CombatEntity,
): IncomingDpsBreakdown {
  const {
    damage: rawHit,
    mitigationMult,
    evasionFactor,
  } = estimateHitDamage(monster, player, {
    attackerIsPlayer: false,
  });

  const reflectionFactor = incomingReflectionFactor(monster, player);
  const hitDamage = rawHit * reflectionFactor;
  const freq = monster.frequency ?? 0;
  const totalDps = hitDamage * freq;
  const playerHp = player.hp ?? 0;

  const sustainLines: DpsBreakdown["sustainLines"] = [];
  if (reflectionFactor < 1 && player.reflection) {
    sustainLines.push({
      key: "reflection",
      label: "Reflection",
      perSecond: (rawHit - hitDamage) * freq,
      detail: `${player.reflection}% magical hits reflected`,
    });
  }

  return {
    hitDamage,
    mitigationMult,
    evasionFactor,
    reflectionFactor,
    autoAttackDps: totalDps,
    abilityDps: 0,
    totalDps,
    sustainLines: sustainLines.length > 0 ? sustainLines : undefined,
    hitsToKill: hitDamage > 0 && playerHp > 0 ? Math.ceil(playerHp / hitDamage) : null,
    secondsToDeath: totalDps > 0 && playerHp > 0 ? playerHp / totalDps : null,
  };
}
