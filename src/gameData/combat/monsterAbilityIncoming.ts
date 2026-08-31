import { CustomGData } from "../../GDataContext";
import { estimateHitDamage } from "./estimateHitDamage";
import type { CombatEntity, DamageType } from "./types";

export type MonsterAbilityDef = {
  cooldown?: number;
  heal?: number;
  damage?: number;
  amount?: number;
  pure?: boolean;
  radius?: number;
  unlimited?: boolean;
};

const ATTACK_PROXY: Record<string, string> = {
  multi_burn: "fireball",
  multi_freeze: "frostball",
};

const HEAL_ABILITIES = new Set(["self_healing", "healing"]);
const DEBUFF_ABILITIES = new Set(["mtangle", "stone"]);
const SKIP_ABILITIES = new Set(["portal", "anger", "degen", "warp_on_hit"]);

function resolveAbilityHit(
  abilityKey: string,
  abilityDef: MonsterAbilityDef,
  G: CustomGData,
  fallbackDamageType: DamageType,
): { rawDamage: number; damageType: DamageType; label: string } | null {
  const skillKey = ATTACK_PROXY[abilityKey] ?? abilityKey;
  const skill = G.skills[skillKey];

  const rawDamage = abilityDef.damage ?? abilityDef.amount ?? skill?.damage;
  if (!rawDamage || rawDamage <= 0) return null;

  let damageType: DamageType = fallbackDamageType;
  if (abilityDef.pure) {
    damageType = "pure";
  } else if (skill?.damage_type) {
    damageType = skill.damage_type as DamageType;
  }

  const label = skill?.name ?? abilityKey;
  return { rawDamage, damageType, label };
}

/** Expected incoming DPS from monster cooldown abilities (zap, multi_burn, deepfreeze, etc.). */
export function estimateMonsterAbilityIncoming(
  abilities: Record<string, MonsterAbilityDef> | undefined,
  G: CustomGData,
  monster: CombatEntity,
  player: CombatEntity,
): {
  abilityDps: number;
  abilityLines: { key: string; label: string; dps: number; detail?: string }[];
  debuffLines: { key: string; label: string; detail: string }[];
  monsterSustainLines: { key: string; label: string; perSecond: number; detail: string }[];
} {
  const abilityLines: { key: string; label: string; dps: number; detail?: string }[] = [];
  const debuffLines: { key: string; label: string; detail: string }[] = [];
  const monsterSustainLines: { key: string; label: string; perSecond: number; detail: string }[] =
    [];

  if (!abilities) {
    return { abilityDps: 0, abilityLines, debuffLines, monsterSustainLines };
  }

  let abilityDps = 0;
  const fallbackType = monster.damage_type ?? "physical";

  for (const [key, def] of Object.entries(abilities)) {
    if (def.unlimited) continue;
    if (SKIP_ABILITIES.has(key)) continue;

    if (HEAL_ABILITIES.has(key) && def.heal && def.cooldown) {
      monsterSustainLines.push({
        key,
        label: G.skills[key]?.name ?? key,
        perSecond: def.heal / (def.cooldown / 1000),
        detail: `${def.heal} heal / ${(def.cooldown / 1000).toFixed(1)}s cd`,
      });
      continue;
    }

    if (DEBUFF_ABILITIES.has(key)) {
      const skill = G.skills[key];
      debuffLines.push({
        key,
        label: skill?.name ?? key,
        detail: skill?.explanation ?? `Every ${((def.cooldown ?? 0) / 1000).toFixed(1)}s`,
      });
      continue;
    }

    if (!def.cooldown || def.cooldown <= 0) continue;

    const hit = resolveAbilityHit(key, def, G, fallbackType);
    if (!hit) continue;

    const attacker: CombatEntity = {
      attack: hit.rawDamage,
      frequency: 0,
      damage_type: hit.damageType,
      crit: monster.crit,
      critdamage: monster.critdamage,
    };
    const { damage: mitigated } = estimateHitDamage(attacker, player, {
      attackerIsPlayer: false,
    });
    const usesPerSec = 1000 / def.cooldown;
    const dps = mitigated * usesPerSec;
    if (dps <= 0) continue;

    abilityDps += dps;
    abilityLines.push({
      key: `mability:${key}`,
      label: hit.label,
      dps,
      detail: `${hit.rawDamage} ${hit.damageType} · ${(def.cooldown / 1000).toFixed(1)}s cd`,
    });
  }

  return { abilityDps, abilityLines, debuffLines, monsterSustainLines };
}
