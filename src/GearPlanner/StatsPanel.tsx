import { Grid, Divider, Table, TableRow, TableCell, TableBody } from "@mui/material";
import { ItemInfo, SlotType, StatType } from "typed-adventureland";
import { useContext } from "react";

import { ATTRIBUTES } from "../constants";
import { GDataContext, MainStatType, CustomGData } from "../GDataContext";
import { resolveCombatStatsFromLoadout } from "../gameData/combat";
import { getItemEffects } from "../gameData/itemEffects";
import { formatCharacterStatValue } from "../gameData/prettyNumbers";
import { CombatSimPanel, IncomingDamagePanel } from "../Shared/CombatSimPanel";
import { SelectedCharacterClass } from "./types";

function AbilityLines({ gear, G }: { gear: { [slot in SlotType]?: ItemInfo }; G: CustomGData }) {
  const lines: string[] = [];
  for (const itemInfo of Object.values(gear)) {
    if (!itemInfo) continue;
    const gItem = G.items[itemInfo.name];
    if (!gItem) continue;
    const effects = getItemEffects(gItem, itemInfo.level, {
      skills: G.skills as never,
      conditions: G.conditions as never,
    });
    for (const effect of effects) {
      if (effect.kindLabel === "Ability" || effect.kindLabel === "Aura") {
        lines.push(`${gItem.name}: ${effect.title}${effect.summary ? ` — ${effect.summary}` : ""}`);
      }
    }
  }
  if (lines.length === 0) return null;
  return (
    <>
      <Divider textAlign="left">ABILITIES / AURAS</Divider>
      <Table size="small">
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line}>
              <TableCell>{line}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}

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

  const mainStatTypes: MainStatType[] = ["dex", "int", "vit", "str", "for"];
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
    "explosion",
    "blast",
  ] as StatType[];
  const otherStatTypes: StatType[] = ["speed", "range", "mp_cost", "mp_reduction"];

  const stats: { [T in StatType]?: number } = selectedCharacterClass
    ? resolveCombatStatsFromLoadout({
        characterClass: selectedCharacterClass,
        level,
        gear,
        G,
      })
    : {};

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
        stat !== "a" &&
        stat !== "e" &&
        stat !== "attr0" &&
        stat !== "attr1" &&
        stat !== "damage_type" &&
        stat !== "heal" &&
        typeof value === "number",
    )
    .forEach(([stat]) => otherStatTypes.push(stat as unknown as StatType));

  const getStatsDescription = (key: StatType | MainStatType) => {
    const attr = ATTRIBUTES[key];
    return `${attr?.description ?? ""}`;
  };

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={3}>
        <CombatSimPanel G={G} characterClass={selectedCharacterClass} level={level} gear={gear} />
        <IncomingDamagePanel
          G={G}
          characterClass={selectedCharacterClass}
          level={level}
          gear={gear}
        />
      </Grid>
      <Grid item xs={12} md={9}>
        <Grid container>
          <Grid item xs={12} sm={3}>
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
                      sx={{
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
          <Grid item xs={12} sm={3}>
            <Divider textAlign="left">OFFENSE</Divider>
            <Table size="small">
              <TableBody>
                {offenseStatTypes.map((stat) => (
                  <TableRow key={`stat_${stat}`}>
                    <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                    <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                      {formatCharacterStatValue(stat, stats[stat] ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Divider textAlign="left">DEFENSE</Divider>
            <Table size="small">
              <TableBody>
                {defenseStatTypes.map((stat) => (
                  <TableRow key={`stat_${stat}`}>
                    <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                    <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                      {formatCharacterStatValue(stat, stats[stat] ?? 0)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Divider textAlign="left">OTHER</Divider>
            <Table size="small">
              <TableBody>
                {otherStatTypes
                  .filter((stat) => stats[stat])
                  .map((stat) => (
                    <TableRow key={`stat_${stat}`}>
                      <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                      <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                        {formatCharacterStatValue(stat, stats[stat] ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
            <AbilityLines gear={gear} G={G} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
