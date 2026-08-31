import { estimateHitDamage } from "./estimateHitDamage";
import { incomingReflectionFactor } from "./hitModifiers";
import { estimateMonsterAbilityIncoming, type MonsterAbilityDef } from "./monsterAbilityIncoming";
import type { CombatEntity, DpsBreakdown } from "./types";
import type { CustomGData } from "../../GDataContext";

export type IncomingDpsBreakdown = DpsBreakdown & {
  evasionFactor: number;
  reflectionFactor: number;
  secondsToDeath: number | null;
};

/** Monster auto-attack DPS against a player loadout (incoming damage). */
export function estimateIncomingDps(
  monster: CombatEntity,
  player: CombatEntity,
  options?: {
    G?: CustomGData;
    abilities?: Record<string, MonsterAbilityDef>;
  },
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

  let abilityDps = 0;
  let abilityLines: DpsBreakdown["abilityLines"];
  let debuffLines: DpsBreakdown["debuffLines"];
  if (options?.G && options.abilities) {
    const abilities = estimateMonsterAbilityIncoming(options.abilities, options.G, monster, player);
    abilityDps = abilities.abilityDps;
    abilityLines = abilities.abilityLines.length > 0 ? abilities.abilityLines : undefined;
    debuffLines = abilities.debuffLines.length > 0 ? abilities.debuffLines : undefined;
    if (abilities.monsterSustainLines.length > 0) {
      for (const line of abilities.monsterSustainLines) {
        sustainLines.push({
          key: `monster:${line.key}`,
          label: `${line.label} (monster)`,
          perSecond: line.perSecond,
          detail: line.detail,
        });
      }
    }
  }

  const totalDps = hitDamage * freq + abilityDps;

  return {
    hitDamage,
    mitigationMult,
    evasionFactor,
    reflectionFactor,
    autoAttackDps: hitDamage * freq,
    abilityDps,
    abilityLines,
    debuffLines,
    totalDps,
    sustainLines: sustainLines.length > 0 ? sustainLines : undefined,
    hitsToKill: hitDamage > 0 && playerHp > 0 ? Math.ceil(playerHp / hitDamage) : null,
    secondsToDeath: totalDps > 0 && playerHp > 0 ? playerHp / totalDps : null,
  };
}
