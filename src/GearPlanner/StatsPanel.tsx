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
  Chip,
  Stack,
} from "@mui/material";
import { ItemInfo, MonsterKey, SlotType, StatType } from "typed-adventureland";
import { useContext, useState } from "react";
import { ATTRIBUTES } from "../constants";
import { GDataContext, CustomGData, MainStatType } from "../GDataContext";
import { getItemEffects } from "../gameData/itemEffects";
import { computeLoadoutStats } from "../gameData/loadoutStats";
import { formatCharacterStatValue } from "../gameData/prettyNumbers";
import { SelectedCharacterClass } from "./types";
import {
  Combatant,
  expectedHitDamage,
  hitDamageRange,
  mitigationBreakdown,
  theo_dps,
} from "./calculations";
import { StatDetailDialog } from "./StatDetailDialog";
import {
  InsightStat,
  STATUS_RESIST_STATS,
  StatusResistStat,
  isInsightStat,
  wasteChipsForLoadout,
} from "./statInsights";

function formatMult(mult: number): string {
  return `${(mult * 100).toFixed(1)}%`;
}

const clickableCellSx = {
  cursor: "pointer",
  textDecoration: "underline",
  textDecorationStyle: "dotted" as const,
  textUnderlineOffset: "2px",
  "&:hover": { color: "primary.main" },
};

function MitigationRows({
  source,
  target,
  targetHpLabel,
  onOpenStat,
}: {
  source: Combatant;
  target: Combatant;
  targetHpLabel: string;
  onOpenStat: (stat: InsightStat) => void;
}) {
  const breakdown = mitigationBreakdown(source, target);
  const expected = expectedHitDamage(source, target);
  const range = hitDamageRange(source, target);
  const dps = theo_dps(source, target);
  const targetHp = target.hp ?? 0;
  const hitsToDefeat = expected > 0 && targetHp > 0 ? Math.ceil(targetHp / expected) : null;
  const freq = source.frequency ?? 0;
  const secondsToDefeat = hitsToDefeat != null && freq > 0 ? hitsToDefeat / freq : null;

  const defenseLabel = breakdown.defenseStat === "none" ? "defense" : breakdown.defenseStat;
  const pierceLabel = breakdown.pierceStat === "none" ? "pierce" : breakdown.pierceStat;

  return (
    <Table size="small" sx={{ mt: 0.5 }}>
      <TableBody>
        <TableRow>
          <TableCell>damage type</TableCell>
          <TableCell align="right">{breakdown.damageType}</TableCell>
        </TableRow>
        <TableRow
          hover={breakdown.pierceStat !== "none"}
          onClick={() => {
            if (breakdown.pierceStat !== "none") onOpenStat(breakdown.pierceStat);
          }}
          sx={breakdown.pierceStat !== "none" ? { cursor: "pointer" } : undefined}
        >
          <TableCell sx={breakdown.pierceStat !== "none" ? clickableCellSx : undefined}>
            {pierceLabel}
          </TableCell>
          <TableCell align="right">
            {formatCharacterStatValue(pierceLabel as StatType, breakdown.pierce)}
          </TableCell>
        </TableRow>
        <TableRow
          hover={breakdown.defenseStat !== "none"}
          onClick={() => {
            if (breakdown.defenseStat !== "none") onOpenStat(breakdown.defenseStat);
          }}
          sx={breakdown.defenseStat !== "none" ? { cursor: "pointer" } : undefined}
        >
          <TableCell sx={breakdown.defenseStat !== "none" ? clickableCellSx : undefined}>
            {defenseLabel}
          </TableCell>
          <TableCell align="right">
            {formatCharacterStatValue(defenseLabel as StatType, breakdown.defense)}
          </TableCell>
        </TableRow>
        <TableRow hover onClick={() => onOpenStat("effectiveDefense")} sx={{ cursor: "pointer" }}>
          <TableCell title="defense − 2 × pierce (basic attack)" sx={clickableCellSx}>
            effective defense
          </TableCell>
          <TableCell align="right">{breakdown.effectiveDefense.toFixed(1)}</TableCell>
        </TableRow>
        <TableRow hover onClick={() => onOpenStat("damageMultiplier")} sx={{ cursor: "pointer" }}>
          <TableCell sx={clickableCellSx}>damage multiplier</TableCell>
          <TableCell align="right">{formatMult(breakdown.multiplier)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell title="Mean of 0.9–1.1 attack roll, including expected crit">
            expected hit
          </TableCell>
          <TableCell align="right">
            {expected.toFixed(1)}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
              ({range.low.toFixed(0)}–{range.high.toFixed(0)} raw)
            </Typography>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>theo DPS</TableCell>
          <TableCell align="right">{dps.toFixed(1)}</TableCell>
        </TableRow>
        <TableRow>
          <TableCell>{targetHpLabel}</TableCell>
          <TableCell align="right">
            {hitsToDefeat == null
              ? "—"
              : `${hitsToDefeat} hit${hitsToDefeat === 1 ? "" : "s"}${
                  secondsToDefeat != null ? ` ≈ ${secondsToDefeat.toFixed(1)}s` : ""
                }`}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

function DamageVisualization({ source, target }: { source: Combatant; target: Combatant }) {
  const damage = expectedHitDamage(source, target);
  const maxHealth = target.hp ?? 0;
  if (maxHealth <= 0 || damage <= 0) {
    return (
      <Typography sx={{ mt: 1 }} color="text.secondary">
        No damage estimate (missing attack or HP).
      </Typography>
    );
  }

  const percent = Math.min((damage / maxHealth) * 100, 100);
  const excess = Math.max(damage - maxHealth, 0);
  const healthLeft = maxHealth - damage;
  const hitsToDefeat = Math.ceil(maxHealth / damage);

  return (
    <Box sx={{ mt: 1 }}>
      <Typography sx={{ wordBreak: "break-word" }}>
        Will do {damage.toFixed(2)} damage to you with {healthLeft.toFixed(2)} health left. You will
        be defeated in {hitsToDefeat} hits
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", mt: 1 }}>
        <Box sx={{ width: "100%", mr: 1, minWidth: 0 }}>
          <LinearProgress
            variant="determinate"
            color={percent >= 100 ? "error" : "primary"}
            value={percent}
            sx={{ height: "10px" }}
          />
        </Box>
        <Box sx={{ minWidth: 48, flexShrink: 0 }}>
          <Typography variant="body2" color="text.secondary">{`${percent.toFixed(2)}%`}</Typography>
        </Box>
      </Box>

      {excess > 0 && (
        <Alert variant="outlined" severity="error" sx={{ mt: 1, wordBreak: "break-word" }}>
          WARNING: Monster can deal {excess.toFixed(2)} excess damage! You will be one-shot with{" "}
          {maxHealth.toFixed(2)} health
        </Alert>
      )}
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

function statCellColor(
  value: number | undefined,
  other: number | undefined,
  side: "left" | "right" | undefined,
): string | undefined {
  if (!side || value == null || other == null || value === other) return undefined;
  const better = value > other;
  if (side === "left") return better ? "success.main" : "error.main";
  return better ? "success.main" : "error.main";
}

function toCombatant(entity: Record<string, unknown> | Combatant): Combatant {
  return {
    damage_type: typeof entity.damage_type === "string" ? entity.damage_type : undefined,
    attack: typeof entity.attack === "number" ? entity.attack : undefined,
    armor: typeof entity.armor === "number" ? entity.armor : undefined,
    resistance: typeof entity.resistance === "number" ? entity.resistance : undefined,
    apiercing: typeof entity.apiercing === "number" ? entity.apiercing : undefined,
    rpiercing: typeof entity.rpiercing === "number" ? entity.rpiercing : undefined,
    frequency: typeof entity.frequency === "number" ? entity.frequency : undefined,
    crit: typeof entity.crit === "number" ? entity.crit : undefined,
    critdamage: typeof entity.critdamage === "number" ? entity.critdamage : undefined,
    hp: typeof entity.hp === "number" ? entity.hp : undefined,
  };
}

export function StatsPanel({
  selectedCharacterClass,
  level,
  gear,
  compareStats,
  compareSide,
}: {
  selectedCharacterClass?: SelectedCharacterClass;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  /** When set with compareSide, highlight higher/lower vs the other loadout. */
  compareStats?: { [T in StatType]?: number };
  compareSide?: "left" | "right";
}) {
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent");
  const [detailStat, setDetailStat] = useState<InsightStat | null>(null);
  const G = useContext(GDataContext);

  if (!G) {
    return <></>;
  }

  const mainStatTypes: MainStatType[] = ["dex", "int", "vit", "str", "for"];
  const defenseStatTypes: StatType[] = [
    "resistance",
    "armor",
    "pnresistance",
    "firesistance",
    "fzresistance",
    "phresistance",
    "stresistance",
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

  const stats: { [T in StatType]?: number } = computeLoadoutStats({
    characterClass: selectedCharacterClass,
    level,
    gear,
    G,
  });

  for (const [stat, value] of Object.entries(stats)) {
    if (
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
      typeof value === "number"
    ) {
      otherStatTypes.push(stat as unknown as StatType);
    }
  }

  // TODO: mainhand damage_type override (weapon can change class default)
  const fakePlayer = toCombatant({
    ...stats,
    damage_type: selectedCharacterClass
      ? G.classes[selectedCharacterClass.className].damage_type
      : "physical",
  });

  const gMonster = G.monsters[targetMonster];
  const monster = toCombatant({
    damage_type: gMonster.damage_type,
    attack: gMonster.attack,
    armor: gMonster.armor,
    resistance: gMonster.resistance,
    apiercing: gMonster.apiercing,
    rpiercing: gMonster.rpiercing,
    frequency: gMonster.frequency,
    crit: gMonster.crit,
    hp: gMonster.hp,
  });

  const statusResists = {} as Partial<Record<StatusResistStat, number>>;
  for (const s of STATUS_RESIST_STATS) {
    const v = stats[s as StatType];
    if (typeof v === "number") statusResists[s] = v;
  }

  const chips = wasteChipsForLoadout({
    damageType: fakePlayer.damage_type,
    apiercing: fakePlayer.apiercing,
    rpiercing: fakePlayer.rpiercing,
    monsterArmor: monster.armor,
    monsterResistance: monster.resistance,
    statusResists,
  });

  const getStatsDescription = (key: StatType | MainStatType) => {
    const attr = ATTRIBUTES[key];
    return `${attr?.description ?? ""}`;
  };

  const handleChange = (event: SelectChangeEvent) => {
    setTargetMonster(event.target.value as MonsterKey);
  };

  const openStat = (stat: string) => {
    if (isInsightStat(stat)) setDetailStat(stat);
  };

  const valueSx = (key: StatType | MainStatType) => ({
    color: statCellColor(stats[key], compareStats?.[key], compareSide),
    fontWeight: compareStats && stats[key] !== compareStats[key] ? 700 : undefined,
  });

  const statColumnSx = {
    // Keep dense tables from forcing horizontal overflow on narrow columns.
    "& .MuiTableCell-root": {
      px: { xs: 1, sm: 1.5 },
      py: 0.5,
      fontSize: { xs: "0.8125rem", sm: "0.875rem" },
      wordBreak: "break-word" as const,
    },
  };

  const monsterName = G.monsters[targetMonster].name ?? targetMonster;

  const renderStatRow = (stat: StatType) => {
    const clickable = isInsightStat(stat);
    return (
      <TableRow
        key={`stat_${stat}`}
        hover={clickable}
        onClick={clickable ? () => openStat(stat) : undefined}
        sx={clickable ? { cursor: "pointer" } : undefined}
      >
        <TableCell
          title={
            clickable
              ? `${getStatsDescription(stat)} (click for falloff / waste)`
              : getStatsDescription(stat)
          }
          sx={clickable ? clickableCellSx : undefined}
        >
          {stat}
        </TableCell>
        <TableCell align="right" title={stats[stat]?.toString() ?? ""} sx={valueSx(stat)}>
          {formatCharacterStatValue(stat, stats[stat] ?? 0)}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Grid container spacing={{ xs: 1.5, sm: 2 }}>
      <Grid item xs={12} sm={6} md={3} sx={statColumnSx}>
        <Divider textAlign="left">GENERAL</Divider>
        <Table size="small" aria-label="a dense table">
          <TableBody>
            <TableRow>
              <TableCell title={getStatsDescription("hp")}>hp</TableCell>
              <TableCell align="right" title={stats.hp?.toString() ?? ""} sx={valueSx("hp")}>
                {Math.round(stats.hp ?? 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell title={getStatsDescription("mp")}>mp</TableCell>
              <TableCell align="right" title={stats.mp?.toString() ?? ""} sx={valueSx("mp")}>
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
                <TableCell align="right" title={stats[stat]?.toString() ?? ""} sx={valueSx(stat)}>
                  {Math.round(stats[stat] ?? 0)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Grid>
      <Grid item xs={12} sm={6} md={3} sx={statColumnSx}>
        <Divider textAlign="left">OFFENSE</Divider>
        <Table size="small">
          <TableBody>{offenseStatTypes.map((stat) => renderStatRow(stat))}</TableBody>
        </Table>
      </Grid>
      <Grid item xs={12} sm={6} md={3} sx={statColumnSx}>
        <Divider textAlign="left">DEFENSE</Divider>
        <Table size="small">
          <TableBody>{defenseStatTypes.map((stat) => renderStatRow(stat))}</TableBody>
        </Table>
      </Grid>
      <Grid item xs={12} sm={6} md={3} sx={statColumnSx}>
        <Divider textAlign="left">OTHER</Divider>
        <Table size="small">
          <TableBody>
            {otherStatTypes.filter((stat) => stats[stat]).map((stat) => renderStatRow(stat))}
          </TableBody>
        </Table>
        <AbilityLines gear={gear} G={G} />
      </Grid>
      <Grid item xs={12}>
        <FormControl fullWidth sx={{ mt: { xs: 0.5, sm: 2 } }}>
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
        {/* TODO: share Target monster with Drop Simulator ?monster= URL */}
        {/* TODO: skill pierce (piercingshot), evasion/reflection RNG, fortitude */}
        {chips.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
            {chips.map((chip) => (
              <Chip
                key={chip}
                size="small"
                color="warning"
                variant="outlined"
                label={chip}
                onClick={() => {
                  if (chip.includes("rpiercing")) openStat("rpiercing");
                  else if (chip.includes("apiercing")) openStat("apiercing");
                  else if (chip.includes("pnresistance")) openStat("pnresistance");
                  else if (chip.includes("firesistance")) openStat("firesistance");
                  else if (chip.includes("fzresistance")) openStat("fzresistance");
                  else if (chip.includes("phresistance")) openStat("phresistance");
                  else if (chip.includes("stresistance")) openStat("stresistance");
                  else openStat("apiercing");
                }}
              />
            ))}
          </Stack>
        )}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Divider textAlign="left">ATTACK vs {monsterName}</Divider>
            <MitigationRows
              source={fakePlayer}
              target={monster}
              targetHpLabel="hits to kill"
              onOpenStat={openStat}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Divider textAlign="left">DEFENSE vs {monsterName}</Divider>
            <MitigationRows
              source={monster}
              target={fakePlayer}
              targetHpLabel="hits to defeat you"
              onOpenStat={openStat}
            />
            <DamageVisualization source={monster} target={fakePlayer} />
          </Grid>
        </Grid>
      </Grid>
      <StatDetailDialog
        open={detailStat != null}
        onClose={() => setDetailStat(null)}
        stat={detailStat}
        player={fakePlayer}
        monster={monster}
        monsterName={String(monsterName)}
        playerStats={stats}
        conditions={
          G.conditions as Record<string, { name?: string; defense?: string; debuff?: boolean }>
        }
      />
    </Grid>
  );
}
