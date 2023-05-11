// we need character class, level, gear

import {
  Grid,
  Divider,
  Table,
  TableRow,
  TableCell,
  TableBody,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  MenuItem,
  Typography,
  LinearProgress,
  Alert,
  Box,
} from "@mui/material";
import { ItemInfo, MonsterKey, SlotType, StatType } from "typed-adventureland";
import { useContext, useState } from "react";
import { ATTRIBUTES } from "../constants";
import { GDataContext, MainStatType } from "../GDataContext";
import {
  calculateItemStatsByLevel,
  modifyPlayerStatsByAttributes,
  addItemSetStats,
} from "../Utils";
import { SelectedCharacterClass } from "./types";
import { theo_dps } from "./calculations";

const calculateMainStatByLevel = (
  stat: MainStatType,
  level: number,
  characterClass: SelectedCharacterClass,
) => {
  // const base = characterClass.stats[stat];
  // const scaling = characterClass.lstats[stat];
  // // TODO: need to investiage this formula.
  // return base + Math.floor(scaling * level); // flooring seems to give a correct stat for a lvl 12 warrior for vitality.

  const base = characterClass.stats[stat];
  const scaling = characterClass.lstats[stat];

  // Math.floor seems to give a correct stat for a lvl 12 warrior for vitality.
  if (characterClass.className !== "merchant") {
    // https://discord.com/channels/238332476743745536/238332476743745536/1025815735492161576
    let value = base;
    value += Math.floor(Math.min(level, 40) * scaling);
    if (level > 40) value += Math.floor((Math.min(60, level) - 40) * (scaling * 3));
    return value;
  }

  // merchant
  // number_e — And then we have the followinghttps://discord.com/channels/238332476743745536/238332476743745536/751222233141084170
  let value = base;
  value += Math.min(level, 40) * scaling;
  // Rising
  // merchants have 2 breakpoints, at lvl40 and lvl60
  // between 40-60 they get twice the scaling, from 60 onward 4 times the scaling
  if (level > 40) value += Math.floor((Math.min(60, level) - 40) * (scaling * 2));
  if (level > 60) value += Math.floor((level - 60) * (scaling * 4));

  return value;

  // return (
  //   base +
  //   Math.min(level, 40) * scaling +
  //   (Math.max(40, level) - 40) * 3 * scaling
  // );
  // return base + (level * scaling)
  // naked lvl 49 merchant returns str 6 dex 27 int 70 vit 15 for 0

  // number_e — And then we have the followinghttps://discord.com/channels/238332476743745536/238332476743745536/751222233141084170
  // function main_stat_from_lvl(ctype, lvl){
  //   let main_stat = G.classes[ctype].stats[G.classes[ctype].main_stat]
  //   if(ctype !== "merchant"){
  //     main_stat += Math.min(40,lvl)*1
  //     if(lvl > 40) main_stat += (lvl-40)*3
  //   }else{
  //     main_stat += Math.min(40,lvl)*1
  //     if(lvl > 40) main_stat += (Math.min(60,lvl)-40)*2
  //     if(lvl > 60) main_stat += (lvl-60)*4
  //   }
  //   return main_stat
  // }
};

function DamageVisualization({ source, target }: { source: any; target: any }) {
  const damage = theo_dps(source, target);
  const maxHealth = target.hp;

  const percent = Math.min((damage / maxHealth) * 100, 100);
  const excess = Math.max(damage - maxHealth, 0);
  const healthLeft = maxHealth - damage;
  // const hitsToKill = damage % healthLeft;

  return (
    <div>
      <div>
        <Typography>
          Will do {damage.toFixed(2)} damage to you with {healthLeft.toFixed(2)} health left.
        </Typography>
      </div>
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <Box sx={{ width: "100%", mr: 1 }}>
          <LinearProgress
            variant="determinate"
            color={percent >= 100 ? "error" : "primary"}
            value={percent}
            sx={{ height: "10px" }}
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${percent.toFixed(2)}%`}</Typography>
        </Box>
      </Box>

      {excess > 0 && (
        <Alert variant="outlined" severity="error">
          WARNING: Monster can deal {excess.toFixed(2)} excess damage! You will be one-shot with{" "}
          {maxHealth.toFixed(2)} health
        </Alert>
      )}
    </div>
  );
}

// buffs? mluck?
export function StatsPanel({
  selectedCharacterClass,
  level,
  gear,
}: {
  selectedCharacterClass?: SelectedCharacterClass;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
}) {
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent"); // TODO: store last selected mob in localstorage and load it from there.
  const G = useContext(GDataContext);

  if (!G) {
    return <></>;
  }

  // TODO: determine stats for character
  let stats: { [T in StatType]?: number } = {};
  // https://discord.com/channels/238332476743745536/238332476743745536/1008354654939263076
  // so it is probably 1*lstat to 40 and 3*lstat after
  const mainStatTypes: MainStatType[] = ["dex", "int", "vit", "str", "for"];
  // heal?
  const defenseStatTypes: StatType[] = [
    "resistance",
    "armor",
    "mcourage",
    "pcourage",
    "courage",
    "reflection",
    "lifesteal",
    "manasteal",
    "evasion",
  ] as StatType[];

  const offenseStatTypes: StatType[] = [
    "frequency",
    "attack",
    "apiercing",
    "rpiercing",
    "crit",
    "critdamage",
  ] as StatType[]; // is range offensive?

  const otherStatTypes: StatType[] = [
    "speed",
    "range",
    "mp_cost",
    "mp_reduction" /* , "goldm", "xpm", "luckm" */,
  ];
  // "miss", "reflection", "lifesteal", "manasteal","rpiercing", "apiercing", "crit", "critdamage", "dreturn", "xrange"
  // "pnresistance", "fireresistance", "fzresistance", "stun", "blast", "explosion"
  // "courage", "mcourage", "pcourage", "fear", "pzazz"

  if (selectedCharacterClass) {
    stats = { ...stats, ...selectedCharacterClass };

    for (const stat of mainStatTypes) {
      stats[stat] = calculateMainStatByLevel(stat, level, selectedCharacterClass);
    }
    // console.log("main stats", stats);
  }

  for (const [, itemInfo] of Object.entries(gear)) {
    const itemName = itemInfo.name;
    const gItem = G.items[itemName];
    // TODO: what about special achievements on items?
    const itemStats = calculateItemStatsByLevel(gItem, itemInfo.level);
    Object.entries(itemStats).forEach(([key, value]) => {
      const stat = key as StatType;
      stats[stat] = (stats[stat] ?? 0) + (value ?? 0);
    });
  }

  addItemSetStats(G, stats, gear);

  Object.entries(stats)
    .filter(
      ([stat, value]) =>
        !mainStatTypes.some((x) => x === stat) &&
        !defenseStatTypes.some((x) => x === stat) &&
        !offenseStatTypes.some((x) => x === stat) &&
        !otherStatTypes.some((x) => x === stat) &&
        stat !== "hp" &&
        stat !== "mp" &&
        stat !== "g" &&
        stat !== "s" &&
        stat !== "tier" &&
        stat !== "s" && // stack size
        stat !== "a" && // ???
        stat !== "e" && // ???
        typeof value === "number",
    )
    .forEach(([stat]) => otherStatTypes.push(stat as unknown as StatType));

  modifyPlayerStatsByAttributes(level, stats);

  const fakePlayer = {
    ...stats,
    damage_type: selectedCharacterClass
      ? G.classes[selectedCharacterClass.className].damage_type
      : "physical",
  };

  const getStatsDescription = (key: StatType | MainStatType) => {
    const attr = ATTRIBUTES[key];
    return `${attr?.description ?? ""}`;
  };

  const handleChange = (event: SelectChangeEvent) => {
    setTargetMonster(event.target.value as MonsterKey);
  };

  return (
    <Grid container>
      <Grid item xs={3}>
        <Divider textAlign="left">GENERAL</Divider>
        <Table size="small" aria-label="a dense table">
          <TableBody>
            <TableRow>
              <TableCell title={getStatsDescription("hp")}>hp</TableCell>
              <TableCell align="right" title={stats.hp?.toString() ?? ""}>
                {Math.round(stats.hp ?? 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell title={getStatsDescription("mp")}>mp</TableCell>
              <TableCell align="right" title={stats.mp?.toString() ?? ""}>
                {Math.round(stats.mp ?? 0)}
              </TableCell>
            </TableRow>
            {mainStatTypes.map((stat) => (
              <TableRow key={`stat_${stat}`}>
                <TableCell
                  title={getStatsDescription(stat)}
                  style={{
                    fontWeight: selectedCharacterClass?.main_stat === stat ? "bold" : "normal",
                  }}
                >
                  {stat}
                </TableCell>
                <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                  {Math.round(stats[stat] ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={3}>
        <Divider textAlign="left">OFFENSE</Divider>
        <Table size="small" aria-label="a dense table">
          <TableBody>
            {offenseStatTypes.map((stat) => (
              <TableRow key={`stat_${stat}`}>
                <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                  {Math.round(stats[stat] ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={3}>
        <Divider textAlign="left">DEFENSE</Divider>
        <Table size="small" aria-label="a dense table">
          <TableBody>
            {defenseStatTypes.map((stat) => (
              <TableRow key={`stat_${stat}`}>
                <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                  {Math.round(stats[stat] ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={3}>
        <Divider textAlign="left">OTHER</Divider>
        <Table size="small" aria-label="a dense table">
          <TableBody>
            {otherStatTypes
              .filter((stat) => stats[stat])
              .map((stat) => (
                <TableRow key={`stat_${stat}`}>
                  <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                  <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                    {Math.round(stats[stat] ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={8}>
        <FormControl fullWidth>
          <InputLabel id="monster-target-label">Monster</InputLabel>
          {/* TODO: AutoComplete / search https://mui.com/material-ui/react-autocomplete/ */}
          <Select
            labelId="monster-target-label"
            value={targetMonster}
            label={G.monsters[targetMonster].name}
            onChange={handleChange}
          >
            {Object.entries(G.monsters).map(([key, monster]) => (
              <MenuItem key={key} value={key}>
                {monster.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <br />
        {/* // G.monsters.ent
          // there is attack, frequency, damage_type
          // we could also use range to verify if we can kite it.
          // G.monsters.ent.abilities has a key and a cooldown mtangle
          // G.skills.mtangle applies a condition called tangled
          // G.conditions.tangled appears to set speed to 24
          // TODO: we need a "fake player" object instead of "stats" should be easier to reason about. 
          // TODO: color monster dps red if you will be 1shot, perhaps add a warning icon.
          // TODO: render minimum damage and maximum damage in case of crit.
          // TODO: render your abilities damage / dps against the target
          */}
        <DamageVisualization source={G.monsters[targetMonster]} target={fakePlayer} />
        <br />
        you vs {targetMonster} dps: {theo_dps(fakePlayer, G.monsters[targetMonster])}
      </Grid>
    </Grid>
  );
}

// Rising
// function stat_from_level(stat,lvl,ctype){
//   //Only for non merchant characters
//   const base = G.classes[ctype].stats[stat]
//   const scaling = G.classes[ctype].lstats[stat]
//   return base + Math.min(lvl,40)*scaling + (Math.max(40,lvl)-40)*3*scaling
// }

/**
   * merchant
  base
    dex: 4
    int: 12
    vit: 1
    str: 1
    for: 0

  lstats
    dex: 0.4
    int: 1
    vit: 0.25
    str: 0.1
    for: 0
   */
