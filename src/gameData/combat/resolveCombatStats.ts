import { GItem, ItemInfo, SlotType, StatType, ClassKey } from "typed-adventureland";

import { CustomGData } from "../../GDataContext";
import { calculateClassStatByLevel } from "../classLevelStats";
import { resolveItemInstanceStats } from "../itemProperties";
import {
  addItemSetStats,
  isDoublehandWeapon,
  LoadoutClassDef,
  modifyPlayerStatsByAttributes,
} from "../loadoutStats";
import { applyItemStats, PlayerStatBucket } from "./applyItemStats";
import type { CombatEntity, DamageType } from "./types";

const MAIN_STAT_TYPES: StatType[] = ["str", "int", "dex", "vit", "for"];

function applySlotMods(
  stats: PlayerStatBucket,
  mods: Partial<Record<string, number>> | undefined,
): void {
  if (!mods) return;
  applyItemStats(stats, mods);
}

function classBaseStats(characterClass: LoadoutClassDef, level: number): PlayerStatBucket {
  const stats: PlayerStatBucket = {};
  for (const stat of MAIN_STAT_TYPES) {
    const base = characterClass.stats[stat] ?? 0;
    const lstat = characterClass.lstats[stat] ?? 0;
    stats[stat] = calculateClassStatByLevel(base, lstat, level);
  }
  for (const [stat, value] of Object.entries(characterClass.stats)) {
    if (MAIN_STAT_TYPES.includes(stat as StatType)) continue;
    if (typeof value === "number") {
      stats[stat as StatType] = value;
    }
  }
  return stats;
}

function assembleWeaponAttack(args: {
  itemAttack: number;
  characterClass: LoadoutClassDef;
  className: string;
  stats: PlayerStatBucket;
}): number {
  const { itemAttack, characterClass, className, stats } = args;
  let weaponAttack = Math.max(itemAttack, 5);
  const mainStat = characterClass.main_stat ?? "str";

  if (className === "paladin") {
    weaponAttack *= (stats.str ?? 0) / 20 + (stats.int ?? 0) / 40;
  } else {
    weaponAttack *= (stats[mainStat as StatType] ?? 0) / 20;
  }

  let attack = weaponAttack + (stats.a_attack ?? 0);
  if (className === "priest") {
    attack *= 1.6;
  }

  const output = Math.max(5, stats.output ?? 0);
  if (output) {
    attack = (attack * output) / 100;
  }

  return Math.round(attack);
}

export type ResolvedCombatStats = CombatEntity &
  PlayerStatBucket & {
    heal?: number;
    range?: number;
  };

/**
 * Resolve combat-ready stats from a loadout, mirroring server calculate_player_stats
 * for attack / frequency / piercing (no conditions, party buffs, or elixirs).
 */
export function resolveCombatStatsFromLoadout(args: {
  characterClass: LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
}): ResolvedCombatStats {
  const { characterClass, level, gear, G } = args;
  const { className } = characterClass;
  const classDef = G.classes[className as ClassKey] as unknown as LoadoutClassDef &
    Record<string, number | string | undefined> & { damage_type?: DamageType };
  const stats: PlayerStatBucket = classBaseStats(characterClass, level);

  stats.frequency = (classDef.frequency as number | undefined) ?? 0;
  stats.output = (classDef.output as number | undefined) ?? 0;
  stats.attack = 0;
  stats.a_attack = 0;
  stats.apiercing = (classDef.apiercing as number | undefined) ?? 0;
  stats.rpiercing = (classDef.rpiercing as number | undefined) ?? 0;
  stats.crit = (classDef.crit as number | undefined) ?? 0;
  stats.critdamage = (classDef.critdamage as number | undefined) ?? 0;
  stats.range = (classDef.range as number | undefined) ?? 0;

  let itemAttack = 0;
  const slotOrder: SlotType[] = [
    "ring1",
    "ring2",
    "earring1",
    "earring2",
    "belt",
    "mainhand",
    "offhand",
    "helmet",
    "chest",
    "pants",
    "shoes",
    "gloves",
    "amulet",
    "orb",
    "cape",
  ];

  for (const slot of slotOrder) {
    const itemInfo = gear[slot];
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name] as GItem | undefined;
    if (!gItem) continue;

    const prop = resolveItemInstanceStats({
      def: gItem,
      itemInfo,
      G,
      classKey: className,
    }) as Partial<Record<string, number>> & { class?: string[] };

    const classRestricted = prop.class;
    if (classRestricted && !classRestricted.includes(className)) {
      continue;
    }

    const noRange = slot === "offhand" && gItem.type === "weapon";
    applyItemStats(stats, prop, { noRange });

    if (prop.attack) {
      if (slot === "offhand") {
        itemAttack += prop.attack * 0.7;
      } else {
        itemAttack += prop.attack;
      }
    }

    if (slot === "mainhand" && gItem.wtype) {
      const slotMods =
        characterClass.doublehand?.[gItem.wtype] ?? characterClass.mainhand?.[gItem.wtype];
      applySlotMods(stats, slotMods);
    }
    if (slot === "offhand") {
      const { wtype } = gItem;
      const { type } = gItem;
      const slotMods =
        (wtype && characterClass.offhand?.[wtype]) ||
        (type && characterClass.offhand?.[type]) ||
        (!gear.mainhand ? { no_range: 1 } : undefined);
      if (slotMods) {
        applySlotMods(stats, slotMods as Partial<Record<string, number>>);
      }
    }
  }

  addItemSetStats(G, stats as { [T in StatType]?: number }, gear);

  const main = gear.mainhand;
  const off = gear.offhand;
  if (
    main &&
    off &&
    G.items[main.name]?.wtype === "stars" &&
    G.items[off.name]?.wtype !== "stars"
  ) {
    itemAttack /= 3;
  }

  modifyPlayerStatsByAttributes(level, stats as { [T in StatType]?: number });

  const attack = assembleWeaponAttack({ itemAttack, characterClass, className, stats });
  const heal = className === "priest" ? attack : 0;

  return {
    ...(stats as PlayerStatBucket),
    attack,
    heal,
    frequency: stats.frequency ?? 0,
    damage_type: (classDef.damage_type ?? "physical") as DamageType,
  } as ResolvedCombatStats;
}

/** Swap one slot's item and resolve combat stats (profileset-style compare). */
export function resolveCombatStatsWithSwap(args: {
  characterClass: LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
  slot: SlotType;
  itemInfo: ItemInfo | undefined;
}): ReturnType<typeof resolveCombatStatsFromLoadout> {
  const nextGear = { ...args.gear };
  if (args.itemInfo == null) {
    delete nextGear[args.slot];
  } else {
    nextGear[args.slot] = args.itemInfo;
  }
  if (
    args.slot === "mainhand" &&
    args.itemInfo &&
    isDoublehandWeapon(args.characterClass, args.G.items[args.itemInfo.name])
  ) {
    delete nextGear.offhand;
  }
  return resolveCombatStatsFromLoadout({
    characterClass: args.characterClass,
    level: args.level,
    gear: nextGear,
    G: args.G,
  });
}

/** Build a combat entity from raw game data (monsters). */
export function monsterToCombatEntity(monster: {
  attack?: number;
  frequency?: number;
  damage_type?: string;
  armor?: number;
  resistance?: number;
  hp?: number;
  for?: number;
  evasion?: number;
}): CombatEntity {
  return {
    attack: monster.attack ?? 0,
    frequency: monster.frequency ?? 0,
    damage_type: (monster.damage_type ?? "physical") as DamageType,
    armor: monster.armor,
    resistance: monster.resistance,
    hp: monster.hp,
    for: monster.for,
    evasion: monster.evasion,
  };
}

/** Minimal naked loadout for matrix weapon-only comparison. */
export function defaultMatrixGear(mainhand: ItemInfo | undefined): {
  [slot in SlotType]?: ItemInfo;
} {
  if (!mainhand) return {};
  return { mainhand };
}

export function matrixItemAtLevel(itemKey: string, level: number): ItemInfo {
  return { name: itemKey as ItemInfo["name"], level };
}
