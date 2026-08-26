import {
  Box,
  Button,
  Chip,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { InputHTMLAttributes } from "react";

import { COOP_MIN_DROP_SHARE, COOP_MIN_TABLE_COUNT_SHARE, KillPolicy } from "../gameData/dropSim";
import { DraftDecimalField } from "./DraftDecimalField";
import {
  coopKillScenario,
  equalSplitShare,
  soloKillScenario,
  TYPICAL_COOP_PARTY,
} from "./killScenarioDefaults";
import { luckmToUiPercent } from "./luckFromGear";
import { LuckGearModal } from "./LuckGearModal";
import { DropSimParams } from "./useDropSimParams";

function groupSx(first = false) {
  return {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: 1,
    alignItems: "center",
    pl: first ? 0 : 1.5,
    ml: first ? 0 : 1.5,
    borderLeft: first ? "none" : 1,
    borderColor: "divider",
  };
}

function GroupLabel({ children, title }: { children: string; title: string }) {
  return (
    <Tooltip title={title} arrow placement="top">
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ fontWeight: 600, cursor: "help", whiteSpace: "nowrap", mr: 0.5 }}
      >
        {children}
      </Typography>
    </Tooltip>
  );
}

function CompactNumberField({
  label,
  title,
  value,
  onChange,
  width = 84,
  inputProps,
  disabled,
}: {
  label: string;
  title: string;
  value: number | string;
  onChange: (raw: string) => void;
  width?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  disabled?: boolean;
}) {
  return (
    <Tooltip title={title} arrow placement="top">
      <TextField
        label={label}
        type="number"
        size="small"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        inputProps={inputProps}
        sx={{ width }}
      />
    </Tooltip>
  );
}

export function KillScenarioControls({
  params,
  liveCooperative,
  liveOneHp,
  whatIfLabels,
  policy,
  rollCaption,
  onPatch,
  onResetLive,
  onEqualSplit,
}: {
  params: DropSimParams;
  liveCooperative: boolean;
  liveOneHp: boolean;
  whatIfLabels: string[];
  policy: KillPolicy;
  /** From Kill Drop Plan — server-aligned modifiers; do not re-derive in the UI. */
  rollCaption?: string;
  onPatch: (partial: Partial<DropSimParams>) => void;
  onResetLive: () => void;
  onEqualSplit: () => void;
}) {
  const coopActive = params.cooperative;
  const shareLocked = coopActive && params.oneHp;
  const shareDisabled = !coopActive || shareLocked;
  const belowDropThreshold = coopActive && !policy.dropEligible;
  const minDropPct = COOP_MIN_DROP_SHARE * 100;
  const minTablePct = COOP_MIN_TABLE_COUNT_SHARE * 100;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.25 }}>
        Each kill rolls the monster drop table (plus extra passes in coop). Share is your damage
        fraction on that kill (must exceed {minDropPct}% on coop or you get no loot). Table× N
        counts players above {minTablePct}% contribution, not raw party size.
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.25,
          alignItems: "center",
          rowGap: 1,
        }}
      >
        <Box sx={groupSx(true)}>
          {whatIfLabels.length === 0 ? (
            <Chip size="small" label="Using live defaults" color="success" variant="outlined" />
          ) : (
            whatIfLabels.map((label) => (
              <Chip key={label} size="small" label={label} color="warning" variant="outlined" />
            ))
          )}
          {belowDropThreshold ? (
            <Chip
              size="small"
              label={`Share ≤ ${minDropPct}% — no coop drops`}
              color="error"
              variant="outlined"
            />
          ) : null}
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            Default: {liveCooperative ? "coop" : "solo"}
            {liveOneHp ? " · 1hp" : ""}
          </Typography>
          <Button size="small" onClick={onResetLive} sx={{ textTransform: "none", minWidth: 0 }}>
            Reset
          </Button>
        </Box>

        <Box sx={groupSx()}>
          <GroupLabel title="Solo keeps full drop rates. Coop splits share by damage contribution and adds table passes from players above the table× cutoff.">
            Party
          </GroupLabel>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={params.cooperative ? "coop" : "solo"}
            onChange={(_, value) => {
              if (value == null) return;
              if (value === "coop") {
                const n = params.contributors > 1 ? params.contributors : TYPICAL_COOP_PARTY;
                onPatch(coopKillScenario(params.oneHp, n));
              } else {
                onPatch(soloKillScenario(params.oneHp));
              }
            }}
          >
            <ToggleButton value="solo" sx={{ textTransform: "none", px: 1.25 }}>
              Solo
            </ToggleButton>
            <ToggleButton value="coop" sx={{ textTransform: "none", px: 1.25 }}>
              Coop
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={params.oneHp ? "1hp" : "normal"}
            onChange={(_, value) => {
              if (value == null) return;
              const oneHp = value === "1hp";
              if (!coopActive) {
                onPatch({ oneHp });
                return;
              }
              onPatch({
                oneHp,
                share: oneHp ? 1 : equalSplitShare(params.contributors),
              });
            }}
          >
            <ToggleButton value="normal" sx={{ textTransform: "none", px: 1.25 }}>
              Normal HP
            </ToggleButton>
            <ToggleButton value="1hp" sx={{ textTransform: "none", px: 1.25 }}>
              1hp
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={groupSx()}>
          <GroupLabel title="Luck, monster level, and coop share all scale drop rolls. Map and global pools use the same luck.">
            Roll modifiers
          </GroupLabel>
          <DraftDecimalField
            label="Luck"
            title={`Drop luck multiplier. Matches Luck % on your character sheet (100% = no bonus gear). Coop requires share > ${minDropPct}% for any drops.`}
            value={params.luckm}
            onCommit={(luckm) => onPatch({ luckm })}
            min={0.01}
            max={9999}
            fallback={1}
            inputProps={{ min: 0.01, step: 0.01 }}
            width={80}
          />
          <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: "nowrap" }}>
            = {luckmToUiPercent(params.luckm)}% Luck
          </Typography>
          <LuckGearModal luckm={params.luckm} onApply={(luckm) => onPatch({ luckm })} />
          <CompactNumberField
            label="M.level"
            title="Monster level at kill time, not your character level. Event bosses use their spawn level."
            value={params.level}
            onChange={(raw) => onPatch({ level: Number(raw) || 1 })}
            inputProps={{ min: 1, step: 1 }}
            width={88}
          />
        </Box>

        <Box sx={{ ...groupSx(), opacity: coopActive ? 1 : 0.5 }}>
          <GroupLabel
            title={`Share is your softened damage fraction on this kill (server uses contribution points^0.65). Must exceed ${minDropPct}% for any coop loot. 1hp bosses still require that — they just roll at full share once you qualify.`}
          >
            Coop split
          </GroupLabel>
          <DraftDecimalField
            label="Share"
            title={`0–1. Your damage share on this kill. Server drops nothing when share ≤ ${minDropPct}% (even on 1hp). Forced to roll at share 1 once you qualify on 1hp.`}
            value={params.share}
            onCommit={(share) => onPatch({ share })}
            min={0}
            max={1}
            fallback={equalSplitShare(params.contributors)}
            inputProps={{ min: 0, max: 1, step: 0.01 }}
            width={80}
            disabled={shareDisabled}
          />
          <CompactNumberField
            label="Table× N"
            title={`Players with share > ${minTablePct}% on the kill. Server adds one extra monster table pass per 10 such players (table× = 1 + floor(N ÷ 10)). Approximate — set N to how many qualified, not total party headcount.`}
            value={params.contributors}
            onChange={(raw) => {
              const n = Math.max(1, Math.floor(Number(raw) || 1));
              onPatch({
                contributors: n,
                share: shareLocked ? 1 : equalSplitShare(n),
              });
            }}
            inputProps={{ min: 0, step: 1 }}
            width={88}
            disabled={!coopActive}
          />
          <Tooltip title="Set share = 1 ÷ N and enable coop" arrow>
            <span>
              <Button
                size="small"
                variant="text"
                onClick={onEqualSplit}
                disabled={!coopActive}
                sx={{ textTransform: "none", minWidth: 0 }}
              >
                1/N split
              </Button>
            </span>
          </Tooltip>
        </Box>

        <Box sx={groupSx()}>
          <GroupLabel title="Optionally add map-specific, global, home-server, or konami skin pools.">
            Extra pools
          </GroupLabel>
          <Tooltip
            title="Map at kill time (defaults to a spawn map for the monster). Adds that map's drop table."
            arrow
          >
            <TextField
              label="Map"
              size="small"
              value={params.map}
              onChange={(e) => onPatch({ map: e.target.value.trim() })}
              placeholder="main"
              disabled={params.konami}
              sx={{ width: 100 }}
            />
          </Tooltip>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={params.globals ? "on" : "off"}
            disabled={params.konami}
            onChange={(_, value) => {
              if (value == null) return;
              onPatch({ globals: value === "on" });
            }}
          >
            <ToggleButton value="off" sx={{ textTransform: "none", px: 1.25 }}>
              No globals
            </ToggleButton>
            <ToggleButton value="on" sx={{ textTransform: "none", px: 1.25 }}>
              Globals
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={params.homeServer ? "on" : "off"}
            disabled={params.konami}
            onChange={(_, value) => {
              if (value == null) return;
              onPatch({ homeServer: value === "on" });
            }}
          >
            <ToggleButton
              value="off"
              sx={{ textTransform: "none", px: 1.25 }}
              title="Not on your home server"
            >
              Away
            </ToggleButton>
            <ToggleButton
              value="on"
              sx={{ textTransform: "none", px: 1.25 }}
              title="On home server — also rolls monsters_home_server (e.g. Mr Green / Mr Pumpkin candy)"
            >
              Home server
            </ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={params.konami ? "on" : "off"}
            onChange={(_, value) => {
              if (value == null) return;
              onPatch({ konami: value === "on" });
            }}
          >
            <ToggleButton value="off" sx={{ textTransform: "none", px: 1.25 }}>
              Normal skin
            </ToggleButton>
            <ToggleButton
              value="on"
              sx={{ textTransform: "none", px: 1.25 }}
              title="Konami skin — only the konami drop table rolls (no monster/map/global/home)"
            >
              Konami
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
        {rollCaption ?? "Select a monster to see server-aligned roll modifiers for this scenario."}
      </Typography>
    </Box>
  );
}
