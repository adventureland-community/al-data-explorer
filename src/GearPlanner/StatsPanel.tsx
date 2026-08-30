import {
  Box,
  Divider,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import { ItemInfo, SlotType, StatType, MonsterKey } from "typed-adventureland";
import { useContext } from "react";

import { ATTRIBUTES } from "../constants";
import { GDataContext, MainStatType, CustomGData } from "../GDataContext";
import { resolveCombatStatsFromLoadout } from "../gameData/combat";
import { getItemEffects } from "../gameData/itemEffects";
import { formatCharacterStatValue } from "../gameData/prettyNumbers";
import { CombatSimPanel } from "../Shared/CombatSimPanel";
import { SelectedCharacterClass } from "./types";

const STAT_TABLE_SX = {
  tableLayout: "fixed" as const,
  "& .MuiTableCell-root": {
    px: 1,
    py: 0.35,
    fontSize: 12,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
};

function StatTable({
  title,
  rows,
}: {
  title: string;
  rows: { key: string; value: string; bold?: boolean; title?: string }[];
}) {
  return (
    <Box>
      <Divider textAlign="left" sx={{ mb: 0.5, fontSize: 11 }}>
        {title}
      </Divider>
      <Table size="small" sx={STAT_TABLE_SX}>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.key}>
              <TableCell title={row.title ?? row.key} sx={{ fontWeight: row.bold ? 700 : 400 }}>
                {row.key}
              </TableCell>
              <TableCell align="right" title={row.value}>
                {row.value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

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
    <Box sx={{ mt: 1 }}>
      <Divider textAlign="left" sx={{ mb: 0.5, fontSize: 11 }}>
        ABILITIES / AURAS
      </Divider>
      <Table size="small" sx={STAT_TABLE_SX}>
        <TableHead>
          <TableRow>
            <TableCell>Effect</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.map((line) => (
            <TableRow key={line}>
              <TableCell title={line}>{line}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

export function StatsPanel({
  selectedCharacterClass,
  level,
  gear,
  targetMonster,
  onTargetMonsterChange,
}: {
  selectedCharacterClass?: SelectedCharacterClass;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  targetMonster?: MonsterKey;
  onTargetMonsterChange?: (key: MonsterKey) => void;
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
      <Grid item xs={12} lg={3}>
        <CombatSimPanel
          G={G}
          characterClass={selectedCharacterClass}
          level={level}
          gear={gear}
          targetMonster={targetMonster}
          onTargetMonsterChange={onTargetMonsterChange}
        />
      </Grid>
      <Grid item xs={12} lg={9}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} xl={3}>
            <StatTable
              title="GENERAL"
              rows={[
                {
                  key: "hp",
                  value: String(Math.round(stats.hp ?? 0)),
                  title: getStatsDescription("hp"),
                },
                {
                  key: "mp",
                  value: String(Math.round(stats.mp ?? 0)),
                  title: getStatsDescription("mp"),
                },
                ...mainStatTypes.map((stat) => ({
                  key: stat,
                  value: String(Math.round(stats[stat] ?? 0)),
                  bold: selectedCharacterClass?.main_stat === stat,
                  title: getStatsDescription(stat),
                })),
              ]}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <StatTable
              title="OFFENSE"
              rows={offenseStatTypes.map((stat) => ({
                key: stat,
                value: formatCharacterStatValue(stat, stats[stat] ?? 0),
                title: getStatsDescription(stat),
              }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <StatTable
              title="DEFENSE"
              rows={defenseStatTypes.map((stat) => ({
                key: stat,
                value: formatCharacterStatValue(stat, stats[stat] ?? 0),
                title: getStatsDescription(stat),
              }))}
            />
          </Grid>
          <Grid item xs={12} sm={6} xl={3}>
            <StatTable
              title="OTHER"
              rows={otherStatTypes
                .filter((stat) => stats[stat])
                .map((stat) => ({
                  key: stat,
                  value: formatCharacterStatValue(stat, stats[stat] ?? 0),
                  title: getStatsDescription(stat),
                }))}
            />
            <AbilityLines gear={gear} G={G} />
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
}
