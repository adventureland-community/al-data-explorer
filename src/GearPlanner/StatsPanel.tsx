// we need character class, level, gear

import {
  Grid,
  Divider,
  Table,
  TableRow,
  TableCell,
  TableBody,
} from "@mui/material";
import { ItemInfo, StatType } from "adventureland";
import { SlotType } from "adventureland/dist/src/entities/slots";
import { useContext } from "react";
import { GDataContext, MainStatType } from "../GDataContext";
import {
  calculateItemStatsByLevel,
  modifyPlayerStatsByAttributes,
} from "../Utils";
import { SelectedCharacterClass } from "./types";

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
  const defenseStatTypes: StatType[] = ["resistance", "armor"];
  const offenseStatTypes: StatType[] = ["frequency", "attack"]; // is range offensive?
  const otherStatTypes: StatType[] = [
    "speed",
    "range",
    "mp_cost",
    "mp_reduction" /*, "goldm", "xpm", "luckm"*/,
  ];
  // "miss", "reflection", "lifesteal", "manasteal","rpiercing", "apiercing", "crit", "critdamage", "dreturn", "xrange"
  // "pnresistance", "fireresistance", "fzresistance", "stun", "blast", "explosion"
  // "courage", "mcourage", "pcourage", "fear", "pzazz"

  if (selectedCharacterClass) {
    stats = { ...stats, ...selectedCharacterClass };

    for (const stat of mainStatTypes) {
      stats[stat] = calculateMainStatByLevel(
        stat,
        level,
        selectedCharacterClass
      );
    }
    // console.log("main stats", stats);
  }

  for (const [slot, itemInfo] of Object.entries(gear)) {
    const itemName = itemInfo.name;
    const gItem = G.items[itemName];
    // TODO: what about special achievements on items?
    const itemStats = calculateItemStatsByLevel(gItem, itemInfo.level);
    Object.entries(itemStats).forEach(([key, value]) => {
      const stat = key as StatType;
      stats[stat] = (stats[stat] ?? 0) + (value ?? 0);
    });
  }

  Object.entries(stats)
    .filter(([stat, value]) => {
      return (
        !mainStatTypes.some((x) => x === stat) &&
        !defenseStatTypes.some((x) => x === stat) &&
        !offenseStatTypes.some((x) => x === stat) &&
        !otherStatTypes.some((x) => x === stat) &&
        stat !== "hp" &&
        stat !== "mp" &&
        stat !== "g" &&
        typeof value === "number"
      );
    })
    .forEach(([stat, value]) =>
      otherStatTypes.push(stat as unknown as StatType)
    );

  modifyPlayerStatsByAttributes(level, stats);

  // TODO: str increases hp & armor
  // TODO: int increases mp & resistance
  // TODO: dex increases attack & run speed
  // TODO: vit increases hp proportional to level
  // TODO: mh, oh doublehand causes stat changes as well for the class.

  // TODO: apply gear stats
  // TODO: handle upgrades / compounding
  // TODO: render stats.
  // Pre lvl 60 chars have a newcomers buff as well.

  // stat
  // extra_stat
  return (
    <Grid container>
      <Grid item xs={3}>
        <Divider textAlign="left">GENERAL</Divider>
        <Table size="small" aria-label="a dense table">
          <TableBody>
            <TableRow>
              <TableCell>hp</TableCell>
              <TableCell align={"right"} title={stats.hp?.toString() ?? ""}>
                {Math.round(stats.hp ?? 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>mp</TableCell>
              <TableCell align={"right"} title={stats.mp?.toString() ?? ""}>
                {Math.round(stats.mp ?? 0)}
              </TableCell>
            </TableRow>
            {mainStatTypes.map((stat) => (
              <TableRow key={`stat_${stat}`}>
                <TableCell
                  style={{
                    fontWeight:
                      selectedCharacterClass?.main_stat === stat
                        ? "bold"
                        : "normal",
                  }}
                >
                  {stat}
                </TableCell>
                <TableCell
                  align={"right"}
                  title={stats[stat]?.toString() ?? ""}
                >
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
                <TableCell>{stat}</TableCell>
                <TableCell
                  align={"right"}
                  title={stats[stat]?.toString() ?? ""}
                >
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
                <TableCell>{stat}</TableCell>
                <TableCell
                  align={"right"}
                  title={stats[stat]?.toString() ?? ""}
                >
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
                  <TableCell key={`stat_${stat}`}>{stat}</TableCell>
                  <TableCell
                    align={"right"}
                    title={stats[stat]?.toString() ?? ""}
                  >
                    {Math.round(stats[stat] ?? 0)}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Grid>
    </Grid>
  );
}

const calculateMainStatByLevel = (
  stat: MainStatType,
  level: number,
  characterClass: SelectedCharacterClass
) => {
  const base = characterClass.stats[stat];
  const scaling = characterClass.lstats[stat];
  // TODO: need to investiage this formula.
  return base + Math.floor(scaling * level); // flooring seems to give a correct stat for a lvl 12 warrior for vitality.

  //

  // return (
  //   base +
  //   Math.min(level, 40) * scaling +
  //   (Math.max(40, level) - 40) * 3 * scaling
  // );
  // return base + (level * scaling)
  // naked lvl 49 merchant returns str 6 dex 27 int 70 vit 15 for 0
  // Rising — Today at 22:33
  // merchants have 2 breakpoints, at lvl40 and lvl60
  // between 40-60 they get twice the scaling, from 60 onward 4 times the scaling
};

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
