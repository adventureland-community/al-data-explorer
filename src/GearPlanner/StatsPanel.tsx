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
  MenuItem,
  Typography,
  LinearProgress,
  Alert,
  Box,
  Chip,
  Stack,
  TextField,
  IconButton,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import { ItemInfo, MonsterKey, SlotType, StatType } from "typed-adventureland";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ATTRIBUTES } from "../constants";
import { GDataContext, CustomGData, MainStatType } from "../GDataContext";
import { getItemEffects } from "../gameData/itemEffects";
import { computeLoadoutStats, contributionsForStat } from "../gameData/loadoutStats";
import { formatCharacterStatValue } from "../gameData/prettyNumbers";
import { SimEntityAutocomplete } from "../DropSimulator/SimEntityAutocomplete";
import { MonsterImage } from "../Shared/SpriteSkin";
import { SelectedCharacterClass } from "./types";
import {
  Combatant,
  expectedHitDamage,
  hitDamageRange,
  HitPath,
  mitigationBreakdown,
  MitigationOptions,
  resolveDamageType,
  theo_dps,
} from "./calculations";
import { HitDirection, StatDetailDialog } from "./StatDetailDialog";
import {
  InsightStat,
  STATUS_RESIST_STATS,
  StatusResistStat,
  isInsightStat,
  wasteChipsForLoadout,
} from "./statInsights";
import {
  loadLastMonster,
  loadMonsterFavorites,
  saveLastMonster,
  toggleMonsterFavorite,
} from "./monsterTargetPrefs";

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

const MONSTER_ICON_SCALE = 1.35;

function MitigationRows({
  source,
  target,
  targetHpLabel,
  hitDirection,
  onOpenStat,
  mitigationOptions,
}: {
  source: Combatant;
  target: Combatant;
  targetHpLabel: string;
  hitDirection: HitDirection;
  onOpenStat: (stat: InsightStat, hitDirection: HitDirection) => void;
  mitigationOptions: MitigationOptions;
}) {
  const breakdown = mitigationBreakdown(source, target, mitigationOptions);
  const expected = expectedHitDamage(source, target, mitigationOptions);
  const range = hitDamageRange(source, target, mitigationOptions);
  const dps = theo_dps(source, target, mitigationOptions);
  const targetHp = target.hp ?? 0;
  const hitsToDefeat = expected > 0 && targetHp > 0 ? Math.ceil(targetHp / expected) : null;
  const freq = source.frequency ?? 0;
  const secondsToDefeat = hitsToDefeat != null && freq > 0 ? hitsToDefeat / freq : null;

  const defenseLabel = breakdown.defenseStat === "none" ? "defense" : breakdown.defenseStat;
  const pierceLabel = breakdown.pierceStat === "none" ? "pierce" : breakdown.pierceStat;
  const effTitle =
    breakdown.path === "heal"
      ? "defense − pierce, then /2 (heal)"
      : breakdown.path === "splash"
      ? "defense only (splash, no pierce)"
      : breakdown.skillPierce > 0
      ? `defense − 2 × pierce − ${breakdown.skillPierce} skill`
      : "defense − 2 × pierce (basic attack)";

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
            if (breakdown.pierceStat !== "none") onOpenStat(breakdown.pierceStat, hitDirection);
          }}
          sx={breakdown.pierceStat !== "none" ? { cursor: "pointer" } : undefined}
        >
          <TableCell sx={breakdown.pierceStat !== "none" ? clickableCellSx : undefined}>
            {pierceLabel}
            {breakdown.skillPierce > 0 && hitDirection === "youHit"
              ? ` (+${breakdown.skillPierce} skill)`
              : ""}
          </TableCell>
          <TableCell align="right">
            {formatCharacterStatValue(pierceLabel as StatType, breakdown.pierce)}
          </TableCell>
        </TableRow>
        <TableRow
          hover={breakdown.defenseStat !== "none"}
          onClick={() => {
            if (breakdown.defenseStat !== "none") onOpenStat(breakdown.defenseStat, hitDirection);
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
        <TableRow
          hover
          onClick={() => onOpenStat("effectiveDefense", hitDirection)}
          sx={{ cursor: "pointer" }}
        >
          <TableCell title={effTitle} sx={clickableCellSx}>
            effective defense
          </TableCell>
          <TableCell align="right">{breakdown.effectiveDefense.toFixed(1)}</TableCell>
        </TableRow>
        <TableRow hover onClick={() => onOpenStat("for", hitDirection)} sx={{ cursor: "pointer" }}>
          <TableCell title="Target fortitude × damage_multiplier(for × 5)" sx={clickableCellSx}>
            fortitude mult
          </TableCell>
          <TableCell align="right">{formatMult(breakdown.fortitudeMult)}</TableCell>
        </TableRow>
        {(breakdown.damageType === "physical" || breakdown.damageType === "magical") &&
        breakdown.path === "basic" ? (
          <TableRow
            hover
            onClick={() =>
              onOpenStat(
                breakdown.damageType === "physical" ? "evasion" : "reflection",
                hitDirection,
              )
            }
            sx={{ cursor: "pointer" }}
          >
            <TableCell title="Expected land chance = 1 − miss%" sx={clickableCellSx}>
              {breakdown.damageType === "physical" ? "evasion" : "reflection"} / land
            </TableCell>
            <TableCell align="right">
              {breakdown.missChance.toFixed(0)}% miss · {formatMult(breakdown.landChance)} land
            </TableCell>
          </TableRow>
        ) : null}
        <TableRow
          hover
          onClick={() => onOpenStat("damageMultiplier", hitDirection)}
          sx={{ cursor: "pointer" }}
        >
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

function DamageVisualization({
  source,
  target,
  mitigationOptions,
}: {
  source: Combatant;
  target: Combatant;
  mitigationOptions: MitigationOptions;
}) {
  const damage = expectedHitDamage(source, target, mitigationOptions);
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
    for: typeof entity.for === "number" ? entity.for : undefined,
    evasion: typeof entity.evasion === "number" ? entity.evasion : undefined,
    reflection: typeof entity.reflection === "number" ? entity.reflection : undefined,
  };
}

function buildMonsterCombatant(G: CustomGData, key: MonsterKey): Combatant {
  const gMonster = G.monsters[key];
  return toCombatant({
    damage_type: gMonster.damage_type,
    attack: gMonster.attack,
    armor: gMonster.armor,
    resistance: gMonster.resistance,
    apiercing: gMonster.apiercing,
    rpiercing: gMonster.rpiercing,
    frequency: gMonster.frequency,
    crit: gMonster.crit,
    hp: gMonster.hp,
    for: gMonster.for,
    evasion: gMonster.evasion,
    reflection: gMonster.reflection,
  });
}

export function StatsPanel({
  selectedCharacterClass,
  level,
  gear,
  compareStats,
  compareSide,
  onHighlightSlot,
}: {
  selectedCharacterClass?: SelectedCharacterClass;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  /** When set with compareSide, highlight higher/lower vs the other loadout. */
  compareStats?: { [T in StatType]?: number };
  compareSide?: "left" | "right";
  onHighlightSlot?: (slot: SlotType | null) => void;
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent");
  const [compareMonster, setCompareMonster] = useState<MonsterKey | null>(null);
  const [favorites, setFavorites] = useState<MonsterKey[]>(() => loadMonsterFavorites());
  const [hitPath, setHitPath] = useState<HitPath>("basic");
  const [skillPierce, setSkillPierce] = useState(0);
  const [detailStat, setDetailStat] = useState<InsightStat | null>(null);
  const [detailHitDirection, setDetailHitDirection] = useState<HitDirection>("youHit");
  const monsterPrefsInit = useRef(false);
  const G = useContext(GDataContext);

  useEffect(() => {
    if (!G || monsterPrefsInit.current) return;
    monsterPrefsInit.current = true;
    const urlMonster = searchParams.get("monster");
    if (urlMonster && G.monsters[urlMonster as MonsterKey]) {
      setTargetMonster(urlMonster as MonsterKey);
    } else {
      const last = loadLastMonster();
      if (last && G.monsters[last]) setTargetMonster(last);
    }
    const urlCompare = searchParams.get("compareMonster");
    if (urlCompare && G.monsters[urlCompare as MonsterKey]) {
      setCompareMonster(urlCompare as MonsterKey);
    }
  }, [G, searchParams]);

  useEffect(() => {
    if (!G || !monsterPrefsInit.current) return;
    saveLastMonster(targetMonster);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("monster", targetMonster);
        if (compareMonster) next.set("compareMonster", compareMonster);
        else next.delete("compareMonster");
        return next;
      },
      { replace: true },
    );
  }, [G, targetMonster, compareMonster, setSearchParams]);

  const monsterOptions = useMemo(
    () => (G ? Object.keys(G.monsters).sort((a, b) => a.localeCompare(b)) : []),
    [G],
  );

  if (!G) {
    return <></>;
  }

  const attackMitigation: MitigationOptions = {
    path: hitPath,
    // Skill pierce is info-only on basic attacks; heal/splash ignore it live.
    skillPierce: hitPath === "basic" && skillPierce > 0 ? skillPierce : undefined,
    attackerIsPlayer: true,
  };
  // Inbound monster hits always use basic complete_attack (heal/splash are outbound paths).
  const defenseMitigation: MitigationOptions = { path: "basic" };

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

  // Mainhand damage_type overrides class default (heal → magical for pairing).
  const classDamageType = selectedCharacterClass
    ? G.classes[selectedCharacterClass.className].damage_type
    : "physical";
  const mainhandDamageType = gear.mainhand?.name
    ? G.items[gear.mainhand.name]?.damage_type
    : undefined;
  const resolvedDamageType = resolveDamageType(
    { damage_type: classDamageType },
    mainhandDamageType,
  );

  const fakePlayer = toCombatant({
    ...stats,
    damage_type: resolvedDamageType,
    for: stats.for,
    evasion: stats.evasion,
    reflection: stats.reflection,
  });

  const monster = buildMonsterCombatant(G, targetMonster);
  const compareMob = compareMonster ? buildMonsterCombatant(G, compareMonster) : null;

  const statusResists = {} as Partial<Record<StatusResistStat, number>>;
  for (const s of STATUS_RESIST_STATS) {
    const v = stats[s as StatType];
    if (typeof v === "number") statusResists[s] = v;
  }

  const chipSkillPierce = hitPath === "basic" && skillPierce > 0 ? skillPierce : undefined;
  // Heal path pairs magical even when the class/mainhand sheet type is physical.
  const chipDamageType = hitPath === "heal" ? "magical" : fakePlayer.damage_type;
  const chips = wasteChipsForLoadout({
    damageType: chipDamageType,
    apiercing: fakePlayer.apiercing,
    rpiercing: fakePlayer.rpiercing,
    monsterArmor: monster.armor,
    monsterResistance: monster.resistance,
    statusResists,
    skillPierce: chipSkillPierce,
  });

  const compareChips =
    compareMob &&
    wasteChipsForLoadout({
      damageType: chipDamageType,
      apiercing: fakePlayer.apiercing,
      rpiercing: fakePlayer.rpiercing,
      monsterArmor: compareMob.armor,
      monsterResistance: compareMob.resistance,
      statusResists,
      skillPierce: chipSkillPierce,
    });

  const getStatsDescription = (key: StatType | MainStatType) => {
    const attr = ATTRIBUTES[key];
    return `${attr?.description ?? ""}`;
  };

  const toggleFavorite = (key: MonsterKey) => {
    setFavorites(toggleMonsterFavorite(key));
  };

  const openStat = (stat: string, hitDirection: HitDirection = "youHit") => {
    if (!isInsightStat(stat)) return;
    setDetailHitDirection(hitDirection);
    setDetailStat(stat);
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
    const sheetDirection: HitDirection =
      stat === "armor" ||
      stat === "resistance" ||
      stat === "for" ||
      stat === "evasion" ||
      stat === "reflection"
        ? "theyHit"
        : "youHit";
    return (
      <TableRow
        key={`stat_${stat}`}
        hover={clickable}
        onClick={clickable ? () => openStat(stat, sheetDirection) : undefined}
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
            {mainStatTypes.map((stat) => {
              const clickable = isInsightStat(stat);
              return (
                <TableRow
                  key={`stat_${stat}`}
                  hover={clickable}
                  onClick={clickable ? () => openStat(stat, "youHit") : undefined}
                  sx={clickable ? { cursor: "pointer" } : undefined}
                >
                  <TableCell
                    title={
                      clickable
                        ? `${getStatsDescription(stat)} (click for falloff / waste)`
                        : getStatsDescription(stat)
                    }
                    sx={{
                      fontWeight: selectedCharacterClass?.main_stat === stat ? "bold" : "normal",
                      ...(clickable ? clickableCellSx : undefined),
                    }}
                  >
                    {stat}
                  </TableCell>
                  <TableCell align="right" title={stats[stat]?.toString() ?? ""} sx={valueSx(stat)}>
                    {Math.round(stats[stat] ?? 0)}
                  </TableCell>
                </TableRow>
              );
            })}
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
        {favorites.length > 0 ? (
          <Stack direction="row" flexWrap="wrap" gap={0.5} sx={{ mb: 1 }}>
            {favorites.map((key) => (
              <Chip
                key={key}
                size="small"
                variant={key === targetMonster ? "filled" : "outlined"}
                label={G.monsters[key]?.name ?? key}
                onClick={() => setTargetMonster(key)}
                onDelete={() => toggleFavorite(key)}
                deleteIcon={<StarIcon fontSize="small" />}
              />
            ))}
          </Stack>
        ) : null}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          flexWrap="wrap"
          gap={2}
          alignItems={{ sm: "flex-end" }}
          sx={{ mt: { xs: 0.5, sm: 2 } }}
        >
          <SimEntityAutocomplete
            fullWidth
            options={monsterOptions as MonsterKey[]}
            value={targetMonster}
            label="Target monster"
            onChange={(value) => {
              if (value) setTargetMonster(value);
            }}
            getOptionLabel={(option) => {
              const name = G.monsters[option]?.name;
              return name ? `${name} (${option})` : option;
            }}
            getPrimaryLabel={(option) => G.monsters[option]?.name ?? option}
            getSecondaryLabel={(option) => option}
            filterOption={(key, q) => {
              if (key.toLowerCase().includes(q)) return true;
              const name = G.monsters[key as MonsterKey]?.name;
              return Boolean(name && name.toLowerCase().includes(q));
            }}
            renderListIcon={(option) => (
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MonsterImage
                  monsterName={option as MonsterKey}
                  opacity={1}
                  scale={MONSTER_ICON_SCALE}
                  tooltip={false}
                />
              </Box>
            )}
            renderInputIcon={(option) => (
              <MonsterImage
                monsterName={option as MonsterKey}
                opacity={1}
                scale={1.1}
                tooltip={false}
              />
            )}
          />
          <IconButton
            aria-label={
              favorites.includes(targetMonster) ? "Remove monster favorite" : "Favorite monster"
            }
            onClick={() => toggleFavorite(targetMonster)}
            color={favorites.includes(targetMonster) ? "warning" : "default"}
          >
            {favorites.includes(targetMonster) ? <StarIcon /> : <StarBorderIcon />}
          </IconButton>
          <SimEntityAutocomplete
            fullWidth
            options={monsterOptions as MonsterKey[]}
            value={compareMonster}
            label="Compare vs (optional)"
            onChange={(value) => setCompareMonster(value)}
            getOptionLabel={(option) => {
              const name = G.monsters[option]?.name;
              return name ? `${name} (${option})` : option;
            }}
            getPrimaryLabel={(option) => G.monsters[option]?.name ?? option}
            getSecondaryLabel={(option) => option}
            filterOption={(key, q) => {
              if (key.toLowerCase().includes(q)) return true;
              const name = G.monsters[key as MonsterKey]?.name;
              return Boolean(name && name.toLowerCase().includes(q));
            }}
            renderListIcon={(option) => (
              <Box sx={{ width: 40, height: 40, flexShrink: 0 }}>
                <MonsterImage
                  monsterName={option as MonsterKey}
                  opacity={1}
                  scale={1.2}
                  tooltip={false}
                />
              </Box>
            )}
          />
        </Stack>
        <Stack direction={{ xs: "column", sm: "row" }} gap={2} sx={{ mt: 1.5 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="hit-path-label">Hit path</InputLabel>
            <Select
              labelId="hit-path-label"
              value={hitPath}
              label="Hit path"
              onChange={(e) => setHitPath(e.target.value as HitPath)}
            >
              <MenuItem value="basic">basic</MenuItem>
              <MenuItem value="heal">heal</MenuItem>
              <MenuItem value="splash">splash</MenuItem>
            </Select>
          </FormControl>
          <TextField
            size="small"
            type="number"
            label="Skill pierce"
            value={skillPierce}
            onChange={(e) => setSkillPierce(Math.max(0, Number(e.target.value) || 0))}
            inputProps={{ min: 0, step: 1 }}
            sx={{ width: { xs: "100%", sm: 140 } }}
          />
          <Typography variant="body2" sx={{ alignSelf: "center" }}>
            <Link to={`/drops?monster=${encodeURIComponent(targetMonster)}`}>Drop Simulator</Link>
          </Typography>
        </Stack>
        {chips.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1.5 }}>
            {chips.map((chip) => (
              <Chip
                key={`${chip.openStat}:${chip.text}`}
                size="small"
                color="warning"
                variant="outlined"
                label={chip.text}
                onClick={() => openStat(chip.openStat)}
              />
            ))}
          </Stack>
        )}
        {compareChips && compareChips.length > 0 && compareMonster ? (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mt: 1 }}>
            {compareChips.map((chip) => (
              <Chip
                key={`cmp-${compareMonster}-${chip.openStat}:${chip.text}`}
                size="small"
                color="info"
                variant="outlined"
                label={`${G.monsters[compareMonster]?.name ?? compareMonster}: ${chip.text}`}
                onClick={() => openStat(chip.openStat)}
              />
            ))}
          </Stack>
        ) : null}
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={6}>
            <Divider textAlign="left">ATTACK vs {monsterName}</Divider>
            <MitigationRows
              source={fakePlayer}
              target={monster}
              targetHpLabel="hits to kill"
              hitDirection="youHit"
              onOpenStat={openStat}
              mitigationOptions={attackMitigation}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Divider textAlign="left">DEFENSE vs {monsterName}</Divider>
            <MitigationRows
              source={monster}
              target={fakePlayer}
              targetHpLabel="hits to defeat you"
              hitDirection="theyHit"
              onOpenStat={openStat}
              mitigationOptions={defenseMitigation}
            />
            <DamageVisualization
              source={monster}
              target={fakePlayer}
              mitigationOptions={defenseMitigation}
            />
          </Grid>
        </Grid>
      </Grid>
      <StatDetailDialog
        open={detailStat != null}
        onClose={() => {
          setDetailStat(null);
          onHighlightSlot?.(null);
        }}
        stat={detailStat}
        player={fakePlayer}
        monster={monster}
        monsterName={String(monsterName)}
        playerStats={stats}
        hitDirection={detailHitDirection}
        mitigationOptions={detailHitDirection === "youHit" ? attackMitigation : defenseMitigation}
        onContributionSlot={(slot) => {
          onHighlightSlot?.(slot);
          setDetailStat(null);
        }}
        contributions={
          detailStat != null &&
          detailStat !== "effectiveDefense" &&
          detailStat !== "damageMultiplier"
            ? contributionsForStat({
                stat: detailStat as StatType,
                gear,
                G,
                classKey: selectedCharacterClass?.className,
                characterClass: selectedCharacterClass
                  ? {
                      className: selectedCharacterClass.className,
                      stats: selectedCharacterClass.stats ?? {},
                      lstats: selectedCharacterClass.lstats ?? {},
                      mainhand: selectedCharacterClass.mainhand,
                      doublehand: selectedCharacterClass.doublehand,
                    }
                  : undefined,
              })
            : []
        }
        conditions={
          G.conditions as Record<string, { name?: string; defense?: string; debuff?: boolean }>
        }
      />
    </Grid>
  );
}
