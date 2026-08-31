import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ShieldIcon from "@mui/icons-material/Shield";
import SpeedIcon from "@mui/icons-material/Speed";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Typography,
  Slider,
} from "@mui/material";
import { ItemInfo, MonsterKey, SlotType } from "typed-adventureland";
import { useMemo, useState } from "react";

import { CustomGData } from "../GDataContext";
import {
  DpsBreakdown,
  estimateAutoAttackDps,
  estimateStatWeights,
  estimateTotalDps,
  monsterToCombatEntity,
  resolveCombatStatsFromLoadout,
} from "../gameData/combat";
import { formatCharacterStatValue } from "../gameData/prettyNumbers";
import { LoadoutClassDef } from "../gameData/loadoutStats";
import { SelectedCharacterClass } from "../GearPlanner/types";
import { MonsterTargetPicker } from "./MonsterTargetPicker";

export type CombatSimPanelProps = {
  G: CustomGData;
  characterClass?: SelectedCharacterClass | LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  /** Controlled target (shared between outgoing / incoming). */
  targetMonster?: MonsterKey;
  onTargetMonsterChange?: (key: MonsterKey) => void;
  splashTargetCount?: number;
  onSplashTargetCountChange?: (count: number) => void;
};

export type CombatSimPanelCompactProps = CombatSimPanelProps & {
  compact?: boolean;
};

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 1,
        py: 0.35,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
      }}
    >
      <Typography variant="caption" color="text.secondary" title={hint} noWrap>
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={600} sx={{ whiteSpace: "nowrap" }}>
        {value}
      </Typography>
    </Box>
  );
}

function HeroDps({ value, label }: { value: number; label: string }) {
  return (
    <Box
      sx={{
        textAlign: "center",
        py: 1.5,
        px: 1,
        borderRadius: 1,
        bgcolor: "action.hover",
        border: 1,
        borderColor: "divider",
      }}
    >
      <Typography
        variant="h4"
        component="div"
        sx={{
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontWeight: 700,
          lineHeight: 1.1,
          color: "primary.light",
        }}
      >
        {value.toFixed(1)}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 1 }}>
        {label}
      </Typography>
    </Box>
  );
}

function CombatStatChips({ stats }: { stats: ReturnType<typeof resolveCombatStatsFromLoadout> }) {
  const chips = [
    { label: "attack", value: stats.attack },
    { label: "frequency", value: stats.frequency },
    { label: "range", value: stats.range },
    stats.damage_type === "physical"
      ? { label: "apiercing", value: stats.apiercing }
      : { label: "rpiercing", value: stats.rpiercing },
    { label: "crit", value: stats.crit },
  ].filter((c) => c.value != null && c.value !== 0);

  if (chips.length === 0) return null;

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
      {chips.map((chip) => (
        <Chip
          key={chip.label}
          size="small"
          variant="outlined"
          label={`${chip.label} ${formatCharacterStatValue(chip.label as never, chip.value ?? 0)}`}
          sx={{ fontFamily: "ui-monospace, monospace", fontSize: 11 }}
        />
      ))}
    </Box>
  );
}

function DpsResults({
  breakdown,
  targetName,
  compact,
}: {
  breakdown: DpsBreakdown;
  targetName: string;
  compact?: boolean;
}) {
  return (
    <Box sx={{ mt: 1 }}>
      <HeroDps value={breakdown.totalDps} label={`TOTAL DPS vs ${targetName}`} />

      {!compact && (
        <Box sx={{ mt: 1.25 }}>
          <StatRow label="Auto attack" value={breakdown.autoAttackDps.toFixed(1)} />
          {breakdown.abilityDps > 0 && (
            <StatRow label="Abilities" value={breakdown.abilityDps.toFixed(1)} />
          )}
          {(breakdown.splashDps ?? 0) > 0 && (
            <StatRow label="Splash (nearby)" value={(breakdown.splashDps ?? 0).toFixed(1)} />
          )}
          {breakdown.splashLines?.map((line) => (
            <StatRow
              key={line.key}
              label={`  ${line.label}`}
              value={line.dps.toFixed(1)}
              hint={line.detail}
            />
          ))}
          {breakdown.abilityLines?.map((line) => (
            <StatRow
              key={line.key}
              label={`  ${line.label}`}
              value={line.dps.toFixed(1)}
              hint="Estimated ability contribution"
            />
          ))}
          <Divider sx={{ my: 0.75 }} />
          <StatRow
            label="Hit damage"
            value={breakdown.hitDamage.toFixed(1)}
            hint="Expected per auto-attack after mitigation"
          />
          <StatRow
            label="Mitigation"
            value={`${(breakdown.mitigationMult * 100).toFixed(1)}%`}
            hint="Damage multiplier after armor/resistance and piercing"
          />
          {breakdown.hitsToKill != null && (
            <StatRow label="Hits to kill" value={String(breakdown.hitsToKill)} />
          )}
          {breakdown.simDurationMs != null && (
            <StatRow
              label="Sim"
              value={`${breakdown.simIterations ?? 0} hits / ${(
                breakdown.simDurationMs / 1000
              ).toFixed(0)}s`}
            />
          )}
        </Box>
      )}
    </Box>
  );
}

function computeBreakdown(args: {
  characterClass: SelectedCharacterClass | LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
  G: CustomGData;
  targetEntity: ReturnType<typeof monsterToCombatEntity>;
  simMode: "formulation" | "event";
  splashTargetCount: number;
}): DpsBreakdown {
  const { characterClass, level, gear, G, targetEntity, simMode, splashTargetCount } = args;
  const stats = resolveCombatStatsFromLoadout({
    characterClass,
    level,
    gear,
    G,
  });
  const opts =
    simMode === "event"
      ? {
          mode: "event" as const,
          durationMs: 30_000,
          classKey: characterClass.className,
          splashTargetCount,
        }
      : {
          mode: "formulation" as const,
          classKey: characterClass.className,
          splashTargetCount,
        };
  return estimateTotalDps(stats, targetEntity, G, gear, opts);
}

export function CombatSimPanel({
  G,
  characterClass,
  level,
  gear,
  compact = false,
  targetMonster: targetMonsterProp,
  onTargetMonsterChange,
  splashTargetCount: splashProp,
  onSplashTargetCountChange,
}: CombatSimPanelCompactProps) {
  const [internalTarget, setInternalTarget] = useState<MonsterKey>("ent");
  const targetMonster = targetMonsterProp ?? internalTarget;
  const setTargetMonster = onTargetMonsterChange ?? setInternalTarget;
  const [internalSplash, setInternalSplash] = useState(0);
  const splashTargetCount = splashProp ?? internalSplash;
  const setSplashTargetCount = onSplashTargetCountChange ?? setInternalSplash;

  const [simMode, setSimMode] = useState<"formulation" | "event">("formulation");
  const [eventBreakdown, setEventBreakdown] = useState<DpsBreakdown | null>(null);
  const [tab, setTab] = useState<"outgoing" | "incoming">("outgoing");

  const monster = G.monsters[targetMonster];
  const targetEntity = useMemo(() => monsterToCombatEntity(monster), [monster]);

  const combatStats = useMemo(() => {
    if (!characterClass) return null;
    return resolveCombatStatsFromLoadout({ characterClass, level, gear, G });
  }, [characterClass, gear, G, level]);

  const formulationBreakdown = useMemo(() => {
    if (!characterClass || simMode !== "formulation") return null;
    return computeBreakdown({
      characterClass,
      level,
      gear,
      G,
      targetEntity,
      simMode: "formulation",
      splashTargetCount,
    });
  }, [characterClass, gear, G, level, simMode, splashTargetCount, targetEntity]);

  const incoming = useMemo(() => {
    if (!combatStats) return null;
    return estimateAutoAttackDps(monsterToCombatEntity(monster), combatStats);
  }, [combatStats, monster]);

  const statWeights = useMemo(() => {
    if (!characterClass || compact) return [];
    return estimateStatWeights({
      characterClass,
      level,
      gear,
      G,
      target: targetEntity,
      classKey: characterClass.className,
    }).slice(0, 8);
  }, [characterClass, compact, gear, G, level, targetEntity]);

  const breakdown = simMode === "event" ? eventBreakdown : formulationBreakdown;

  const runEventSim = () => {
    if (!characterClass) return;
    setEventBreakdown(
      computeBreakdown({
        characterClass,
        level,
        gear,
        G,
        targetEntity,
        simMode: "event",
        splashTargetCount,
      }),
    );
  };

  if (!characterClass) {
    return (
      <Paper variant="outlined" sx={{ p: compact ? 1.5 : 2, bgcolor: "background.default" }}>
        <Typography variant="body2" color="text.secondary">
          Select a class to estimate DPS.
        </Typography>
      </Paper>
    );
  }

  const incomingPanel = incoming && combatStats && (
    <Box>
      <StatRow label="Monster DPS" value={incoming.totalDps.toFixed(1)} />
      <StatRow label="Your HP" value={Math.round(combatStats.hp ?? 0).toString()} />
      {incoming.hitDamage > 0 && (combatStats.hp ?? 0) > 0 && (
        <StatRow
          label="Hits until defeat"
          value={String(Math.ceil((combatStats.hp ?? 0) / incoming.hitDamage))}
        />
      )}
    </Box>
  );

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        bgcolor: "background.default",
        borderColor: "divider",
        position: compact ? undefined : { md: "sticky" },
        top: compact ? undefined : 80,
      }}
    >
      <Stack spacing={1.25}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SpeedIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2">Combat sim</Typography>
        </Box>

        <MonsterTargetPicker G={G} value={targetMonster} onChange={setTargetMonster} />

        {combatStats && !compact && <CombatStatChips stats={combatStats} />}

        {!compact && (
          <>
            <Typography variant="caption" color="text.secondary" gutterBottom display="block">
              Nearby splash targets: {splashTargetCount}
            </Typography>
            <Slider
              size="small"
              value={splashTargetCount}
              min={0}
              max={5}
              step={1}
              onChange={(_, v) => setSplashTargetCount(v as number)}
              valueLabelDisplay="auto"
            />
          </>
        )}

        {!compact && (
          <FormControl fullWidth size="small">
            <InputLabel id="combat-mode-label">Mode</InputLabel>
            <Select
              labelId="combat-mode-label"
              value={simMode}
              label="Mode"
              onChange={(e) => {
                setSimMode(e.target.value as "formulation" | "event");
                setEventBreakdown(null);
              }}
            >
              <MenuItem value="formulation">Quick estimate</MenuItem>
              <MenuItem value="event">Event sim (30s)</MenuItem>
            </Select>
          </FormControl>
        )}

        {simMode === "event" && (
          <Button
            variant="contained"
            size="small"
            fullWidth
            startIcon={<AutoFixHighIcon />}
            onClick={runEventSim}
          >
            Simulate
          </Button>
        )}

        {compact ? (
          breakdown && (
            <DpsResults breakdown={breakdown} targetName={monster.name ?? targetMonster} compact />
          )
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0.5 } }}
            >
              <Tab value="outgoing" label="Outgoing" />
              <Tab value="incoming" label="Incoming" />
            </Tabs>
            {tab === "outgoing" && breakdown && (
              <DpsResults breakdown={breakdown} targetName={monster.name ?? targetMonster} />
            )}
            {tab === "incoming" && incomingPanel}
          </>
        )}

        {!compact && statWeights.length > 0 && (
          <Accordion disableGutters elevation={0} sx={{ bgcolor: "transparent" }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 36, px: 0 }}>
              <Typography variant="caption" color="text.secondary">
                Stat weights (DPS per +10)
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 0, pt: 0 }}>
              {statWeights.map((row) => (
                <StatRow
                  key={row.stat}
                  label={row.label}
                  value={`+${row.dpsPer10.toFixed(1)}`}
                  hint={`+${row.dpsPerPoint.toFixed(2)} per point`}
                />
              ))}
            </AccordionDetails>
          </Accordion>
        )}

        {!compact && (
          <>
            <Divider flexItem />
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
              <ShieldIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.2 }} />
              <Typography variant="caption" color="text.secondary">
                Quick mode uses expected crit. Event sim rolls variance, crits, and ability procs
                over 30 seconds.
              </Typography>
            </Box>
          </>
        )}
      </Stack>
    </Paper>
  );
}

/** @deprecated Use CombatSimPanel tabs (Incoming) instead. */
export function IncomingDamagePanel(props: CombatSimPanelProps) {
  const [target, setTarget] = useState<MonsterKey>("ent");
  return (
    <Accordion disableGutters elevation={0} sx={{ mt: 2, bgcolor: "background.default" }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2">Legacy incoming panel</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <CombatSimPanel
          {...props}
          compact
          targetMonster={target}
          onTargetMonsterChange={setTarget}
        />
      </AccordionDetails>
    </Accordion>
  );
}
