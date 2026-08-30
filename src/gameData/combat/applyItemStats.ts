/** Mirrors adventureland_mongodb node/server.js stat_to_attr + frequency handling. */
const STAT_TO_ATTR: Record<string, string> = {
  str: "str",
  int: "int",
  dex: "dex",
  vit: "vit",
  for: "for",
  armor: "armor",
  resistance: "resistance",
  pnresistance: "pnresistance",
  firesistance: "firesistance",
  fzresistance: "fzresistance",
  phresistance: "phresistance",
  stresistance: "stresistance",
  incdmgamp: "incdmgamp",
  stun: "stun",
  blast: "blast",
  explosion: "explosion",
  evasion: "evasion",
  cuteness: "cuteness",
  bling: "bling",
  dreturn: "dreturn",
  reflection: "reflection",
  crit: "crit",
  critdamage: "critdamage",
  miss: "miss",
  avoidance: "avoidance",
  hp: "max_hp",
  mp: "max_mp",
  speed: "speed",
  lifesteal: "lifesteal",
  manasteal: "manasteal",
  apiercing: "apiercing",
  rpiercing: "rpiercing",
  output: "output",
  attack: "a_attack",
  mp_cost: "a_mp_cost",
  mp_reduction: "mp_reduction",
  xp: "xxp",
  luck: "xluck",
  gold: "xgold",
  range: "range",
  courage: "courage",
  mcourage: "mcourage",
  pcourage: "pcourage",
};

export type PlayerStatBucket = Record<string, number | undefined> & {
  frequency?: number;
};

export function applyItemStats(
  player: PlayerStatBucket,
  prop: Partial<Record<string, number>>,
  args?: { noRange?: boolean },
): void {
  for (const [stat, value] of Object.entries(prop)) {
    if (typeof value !== "number") continue;
    if (args?.noRange && stat === "range") continue;

    const mapped = STAT_TO_ATTR[stat];
    if (mapped && mapped !== "frequency") {
      player[mapped] = (player[mapped] ?? 0) + value;
    } else if (stat === "frequency") {
      player.frequency = (player.frequency ?? 0) + value / 100;
    }
  }
}
