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
import { GDataContext, CustomGData, MainStatType } from "../GDataContext";
import { getItemEffects } from "../gameData/itemEffects";
import { computeLoadoutStats } from "../gameData/loadoutStats";
import { SelectedCharacterClass } from "./types";
import { theo_dps } from "./calculations";

function DamageVisualization({ source, target }: { source: any; target: any }) {
  const damage = theo_dps(source, target);
  const maxHealth = target.hp;

  const percent = Math.min((damage / maxHealth) * 100, 100);
  const excess = Math.max(damage - maxHealth, 0);
  const healthLeft = maxHealth - damage;
  const hitsToDefeat = Math.ceil(maxHealth / damage);

  return (
    <div>
      <div>
        <Typography>
          Will do {damage.toFixed(2)} damage to you with {healthLeft.toFixed(2)} health left. You
          will be defeated in {hitsToDefeat} hits
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
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent");
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

  let stats: { [T in StatType]?: number } = {};
  if (selectedCharacterClass) {
    stats = computeLoadoutStats({
      characterClass: selectedCharacterClass,
      level,
      gear,
      G,
    });
  }

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
        typeof value === "number",
    )
    .forEach(([stat]) => otherStatTypes.push(stat as unknown as StatType));

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
      <Grid item xs={3}>
        <Divider textAlign="left">OFFENSE</Divider>
        <Table size="small">
          <TableBody>
            {offenseStatTypes.map((stat) => (
              <TableRow key={`stat_${stat}`}>
                <TableCell title={getStatsDescription(stat)}>{stat}</TableCell>
                <TableCell align="right" title={stats[stat]?.toString() ?? ""}>
                  {Math.round((stats[stat] ?? 0) * (stat === "frequency" ? 100 : 1)) /
                    (stat === "frequency" ? 100 : 1)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={3}>
        <Divider textAlign="left">DEFENSE</Divider>
        <Table size="small">
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
        <Table size="small">
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
        <AbilityLines gear={gear} G={G} />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel id="monster-select-label">Target monster</InputLabel>
          <Select
            labelId="monster-select-label"
            value={targetMonster}
            label="Target monster"
            onChange={handleChange}
          >
            {Object.keys(G.monsters).map((key) => (
              <MenuItem key={key} value={key}>
                {G.monsters[key as MonsterKey].name ?? key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <DamageVisualization source={G.monsters[targetMonster]} target={fakePlayer} />
      </Grid>
    </Grid>
  );
}
