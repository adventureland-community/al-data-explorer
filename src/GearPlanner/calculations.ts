/** Feed this function a value like (character.apiercing - target.armor) and it spits out a multiplier so you can adjust your expected damage */
function damage_multiplier(defense: number) {
  // extracted from AL
  return Math.min(
    1.32,
    Math.max(
      0.05,
      1 -
        (Math.max(0, Math.min(100, defense)) * 0.001 +
          Math.max(0, Math.min(100, defense - 100)) * 0.001 +
          Math.max(0, Math.min(100, defense - 200)) * 0.00095 +
          Math.max(0, Math.min(100, defense - 300)) * 0.0009 +
          Math.max(0, Math.min(100, defense - 400)) * 0.00082 +
          Math.max(0, Math.min(100, defense - 500)) * 0.0007 +
          Math.max(0, Math.min(100, defense - 600)) * 0.0006 +
          Math.max(0, Math.min(100, defense - 700)) * 0.0005 +
          Math.max(0, defense - 800) * 0.0004) +
        Math.max(0, Math.min(50, 0 - defense)) * 0.001 + // Negative's / Armor Piercing
        Math.max(0, Math.min(50, -50 - defense)) * 0.00075 +
        Math.max(0, Math.min(50, -100 - defense)) * 0.0005 +
        Math.max(0, -150 - defense) * 0.00025,
    ),
  );
}

// function dps_multiplier(defense: number) {
//   // [10/12/17]
//   return (
//     1 -
//     (Math.max(0, Math.min(100, defense)) * 0.001 +
//       Math.max(0, Math.min(100, defense - 100)) * 0.001 +
//       Math.max(0, Math.min(100, defense - 200)) * 0.00095 +
//       Math.max(0, Math.min(100, defense - 300)) * 0.0009 +
//       Math.max(0, Math.min(100, defense - 400)) * 0.00082 +
//       Math.max(0, Math.min(100, defense - 500)) * 0.0007 +
//       Math.max(0, Math.min(100, defense - 600)) * 0.0006 +
//       Math.max(0, Math.min(100, defense - 700)) * 0.0005 +
//       Math.max(0, defense - 800) * 0.0004) +
//     Math.max(0, Math.min(50, 0 - defense)) * 0.001 + // Negative's / Armor Piercing
//     Math.max(0, Math.min(50, -50 - defense)) * 0.00075 +
//     Math.max(0, Math.min(50, -100 - defense)) * 0.0005 +
//     Math.max(0, -150 - defense) * 0.00025
//   );
// }

// Originally got this method from Main named cur_mult
function cur_mult(
  source: any, // CharacterEntity | MonsterEntity,
  target: any, // CharacterEntity | MonsterEntity,
) {
  // let source = source_ent ? source_ent : parent.character;
  // let target = target_ent ? target_ent : get_target(parent.character);
  if (!target || !source) return 0;
  const dtype: "physical" | "magical" | "pure" = source.damage_type;

  // the source stats that  can affect the targets resistances
  const pierces = { magical: source.rpiercing, physical: source.apiercing, pure: 0 };

  // resistances of the target
  const resistances = { magical: target.resistance, physical: target.armor, pure: 0 };

  if (dtype === "pure") return 1; // 1 damage if pure?

  const piercing = pierces[dtype] ? pierces[dtype] : 0;
  const resistance = resistances[dtype] ? resistances[dtype] : 0;
  const val = resistance - 2 * piercing;
  // Why are we multiplying by 2? https://discord.com/channels/238332476743745536/238332476743745536/947945565046579270
  return damage_multiplier(val);
}

export function theo_dps(
  source: any, // CharacterEntity | MonsterEntity,
  target: any, // CharacterEntity | MonsterEntity,
) {
  // let source = source_ent ? source_ent : parent.character;
  // let target = target_ent ? target_ent : get_target(parent.character);
  if (!target || !source) return 0;
  const mult = cur_mult(source, target);
  let damage = mult * source.attack;
  let crit_mult = 2;
  const freq = source.frequency ? source.frequency : 0;
  if (source.critdamage) crit_mult += source.critdamage / 100;
  if (source.crit) damage += damage * (source.crit / 100) * crit_mult;
  return damage * freq;
}
