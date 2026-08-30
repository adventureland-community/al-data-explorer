import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import ShieldIcon from "@mui/icons-material/Shield";
import SpeedIcon from "@mui/icons-material/Speed";
import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Typography,
} from "@mui/material";
import { ItemInfo, MonsterKey, SlotType } from "typed-adventureland";
import { useMemo, useState } from "react";

import { CustomGData } from "../GDataContext";
import {
  DpsBreakdown,
  estimateAutoAttackDps,
  estimateTotalDps,
  monsterToCombatEntity,
  resolveCombatStatsFromLoadout,
} from "../gameData/combat";
import { LoadoutClassDef } from "../gameData/loadoutStats";
import { SelectedCharacterClass } from "../GearPlanner/types";

export type CombatSimPanelProps = {
  G: CustomGData;
  characterClass?: SelectedCharacterClass | LoadoutClassDef;
  level: number;
  gear: { [slot in SlotType]?: ItemInfo };
};

export type CombatSimPanelCompactProps = CombatSimPanelProps & {
  compact?: boolean;
};

function StatRow({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 1,
        py: 0.35,
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        fontSize: 12,
      }}
    >
      <Typography variant="caption" color="text.secondary" title={hint}>
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function DpsResults({ breakdown, targetName }: { breakdown: DpsBreakdown; targetName: string }) {
  return (
    <Box sx={{ mt: 1 }}>
      <Typography variant="overline" color="primary.light" sx={{ letterSpacing: 1 }}>
        vs {targetName}
      </Typography>
      <StatRow label="Auto DPS" value={breakdown.autoAttackDps.toFixed(1)} />
      {breakdown.abilityDps > 0 && (
        <StatRow label="Ability DPS" value={breakdown.abilityDps.toFixed(1)} />
      )}
      <StatRow label="Total DPS" value={breakdown.totalDps.toFixed(1)} hint="Auto + abilities" />
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
          label="Sim mode"
          value={`Event (${breakdown.simDurationMs}ms)`}
          hint="Monte Carlo auto-attack timeline"
        />
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
}): DpsBreakdown {
  const { characterClass, level, gear, G, targetEntity, simMode } = args;
  const stats = resolveCombatStatsFromLoadout({
    characterClass,
    level,
    gear,
    G,
  });
  if (simMode === "event") {
    return estimateTotalDps(stats, targetEntity, G, gear, {
      mode: "event",
      durationMs: 30_000,
    });
  }
  return estimateTotalDps(stats, targetEntity, G, gear, {
    mode: "formulation",
    classKey: characterClass.className,
  });
}

export function CombatSimPanel({
  G,
  characterClass,
  level,
  gear,
  compact = false,
}: CombatSimPanelCompactProps) {
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent");
  const [simMode, setSimMode] = useState<"formulation" | "event">("formulation");
  const [eventBreakdown, setEventBreakdown] = useState<DpsBreakdown | null>(null);

  const monster = G.monsters[targetMonster];
  const targetEntity = useMemo(() => monsterToCombatEntity(monster), [monster]);

  const formulationBreakdown = useMemo(() => {
    if (!characterClass || simMode !== "formulation") return null;
    return computeBreakdown({
      characterClass,
      level,
      gear,
      G,
      targetEntity,
      simMode: "formulation",
    });
  }, [characterClass, gear, G, level, simMode, targetEntity]);

  const breakdown = simMode === "event" ? eventBreakdown : formulationBreakdown;

  const handleTargetChange = (event: SelectChangeEvent) => {
    setTargetMonster(event.target.value as MonsterKey);
  };

  const runSim = () => {
    if (!characterClass) return;
    if (simMode === "event") {
      setEventBreakdown(
        computeBreakdown({
          characterClass,
          level,
          gear,
          G,
          targetEntity,
          simMode: "event",
        }),
      );
    }
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

  return (
    <Paper
      variant="outlined"
      sx={{
        p: compact ? 1.5 : 2,
        bgcolor: "background.default",
        borderColor: "divider",
      }}
    >
      <Stack spacing={1.25}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <SpeedIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2">Combat estimate</Typography>
        </Box>

        <FormControl fullWidth size="small">
          <InputLabel id="combat-target-label">Target</InputLabel>
          <Select
            labelId="combat-target-label"
            value={targetMonster}
            label="Target"
            onChange={handleTargetChange}
          >
            {Object.keys(G.monsters).map((key) => (
              <MenuItem key={key} value={key}>
                {G.monsters[key as MonsterKey].name ?? key}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {!compact && (
          <FormControl fullWidth size="small">
            <InputLabel id="combat-mode-label">Mode</InputLabel>
            <Select
              labelId="combat-mode-label"
              value={simMode}
              label="Mode"
              onChange={(e) => setSimMode(e.target.value as "formulation" | "event")}
            >
              <MenuItem value="formulation">Quick (formulation)</MenuItem>
              <MenuItem value="event">Event sim (30s)</MenuItem>
            </Select>
          </FormControl>
        )}

        <Button variant="contained" size="small" startIcon={<AutoFixHighIcon />} onClick={runSim}>
          {simMode === "event" ? "Run sim" : "Refresh"}
        </Button>

        {breakdown && (
          <DpsResults breakdown={breakdown} targetName={monster.name ?? targetMonster} />
        )}

        <Divider flexItem />

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <ShieldIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography variant="caption" color="text.secondary">
            Formulation uses expected crit. Event sim rolls variance ±10% per hit.
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export function IncomingDamagePanel({ G, characterClass, level, gear }: CombatSimPanelProps) {
  const [targetMonster, setTargetMonster] = useState<MonsterKey>("ent");
  const monster = G.monsters[targetMonster];
  const monsterEntity = useMemo(() => monsterToCombatEntity(monster), [monster]);

  const playerStats = useMemo(() => {
    if (!characterClass) return null;
    return resolveCombatStatsFromLoadout({ characterClass, level, gear, G });
  }, [characterClass, gear, G, level]);

  const incoming = useMemo(() => {
    if (!playerStats) return null;
    return estimateAutoAttackDps(monsterEntity, playerStats);
  }, [monsterEntity, playerStats]);

  if (!characterClass || !incoming || !playerStats) {
    return null;
  }

  const hp = playerStats.hp ?? 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: "background.default" }}>
      <Typography variant="subtitle2" gutterBottom>
        Incoming — {monster.name}
      </Typography>
      <StatRow label="Monster DPS" value={incoming.totalDps.toFixed(1)} />
      <StatRow label="Your HP" value={Math.round(hp).toString()} />
      {incoming.hitsToKill != null && hp > 0 && (
        <StatRow label="Hits until defeat" value={String(Math.ceil(hp / incoming.hitDamage))} />
      )}
      <FormControl fullWidth size="small" sx={{ mt: 1 }}>
        <InputLabel id="incoming-target-label">Threat</InputLabel>
        <Select
          labelId="incoming-target-label"
          value={targetMonster}
          label="Threat"
          onChange={(e) => setTargetMonster(e.target.value as MonsterKey)}
        >
          {Object.keys(G.monsters).map((key) => (
            <MenuItem key={key} value={key}>
              {G.monsters[key as MonsterKey].name ?? key}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
}
