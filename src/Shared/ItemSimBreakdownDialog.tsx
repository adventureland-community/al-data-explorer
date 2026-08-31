import CloseIcon from "@mui/icons-material/Close";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { ItemKey } from "typed-adventureland";

import { DpsBreakdown, ItemSimEquipNote, ResolvedCombatStats } from "../gameData/combat";
import { formatCharacterStatValue } from "../gameData/prettyNumbers";
import { ItemInstance } from "./ItemInstance";

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: 1,
        py: 0.35,
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" fontWeight={600}>
        {value}
      </Typography>
    </Box>
  );
}

function EquipNote({ note }: { note: ItemSimEquipNote }) {
  const severity = note.kind === "error" ? "error" : note.kind === "warning" ? "warning" : "info";
  return (
    <Alert severity={severity} icon={false} sx={{ py: 0.25, fontSize: 12 }}>
      {note.text}
    </Alert>
  );
}

export function ItemSimBreakdownDialog({
  open,
  onClose,
  itemKey,
  upgradeLevel,
  itemName,
  characterClassName,
  playerLevel,
  targetName,
  breakdown,
  combatStats,
  equipNotes,
}: {
  open: boolean;
  onClose: () => void;
  itemKey: ItemKey;
  upgradeLevel: number;
  itemName: string;
  characterClassName: string;
  playerLevel: number;
  targetName: string;
  breakdown: DpsBreakdown;
  combatStats: ResolvedCombatStats;
  equipNotes: ItemSimEquipNote[];
}) {
  const combatChips = [
    { label: "attack", value: combatStats.attack },
    { label: "frequency", value: combatStats.frequency },
    { label: "range", value: combatStats.range },
    combatStats.damage_type === "physical"
      ? { label: "apiercing", value: combatStats.apiercing }
      : { label: "rpiercing", value: combatStats.rpiercing },
    { label: "crit", value: combatStats.crit },
  ].filter((c) => c.value != null && c.value !== 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <ItemInstance
            itemInfo={{ name: itemKey, level: upgradeLevel }}
            size={40}
            tooltip={false}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" noWrap>
              {itemName} +{upgradeLevel}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {characterClassName} L{playerLevel} vs {targetName}
            </Typography>
          </Box>
        </Stack>
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {equipNotes.length > 0 && (
          <Stack spacing={0.75} sx={{ mb: 2 }}>
            {equipNotes.map((note) => (
              <EquipNote key={note.text} note={note} />
            ))}
          </Stack>
        )}

        <Box
          sx={{
            textAlign: "center",
            py: 1.5,
            mb: 2,
            borderRadius: 1,
            bgcolor: "action.hover",
            border: 1,
            borderColor: "divider",
          }}
        >
          <Typography
            variant="h4"
            sx={{ fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "primary.light" }}
          >
            {breakdown.totalDps.toFixed(1)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            TOTAL DPS
          </Typography>
        </Box>

        <Typography variant="overline" color="text.secondary">
          Breakdown
        </Typography>
        <StatLine label="Auto attack" value={breakdown.autoAttackDps.toFixed(1)} />
        {breakdown.abilityLines?.map((line) => (
          <Box key={line.key} sx={{ pl: 1 }}>
            <StatLine label={line.label} value={line.dps.toFixed(1)} />
            {line.detail && (
              <Typography variant="caption" color="text.secondary" sx={{ pl: 1, display: "block" }}>
                {line.detail}
              </Typography>
            )}
          </Box>
        ))}
        {breakdown.abilityDps > 0 && !breakdown.abilityLines?.length && (
          <StatLine label="Abilities (total)" value={breakdown.abilityDps.toFixed(1)} />
        )}
        {(breakdown.splashDps ?? 0) > 0 && (
          <StatLine label="Splash (nearby)" value={(breakdown.splashDps ?? 0).toFixed(1)} />
        )}
        {breakdown.splashLines?.map((line) => (
          <Box key={line.key} sx={{ pl: 1 }}>
            <StatLine label={line.label} value={line.dps.toFixed(1)} />
            {line.detail && (
              <Typography variant="caption" color="text.secondary" sx={{ pl: 1, display: "block" }}>
                {line.detail}
              </Typography>
            )}
          </Box>
        ))}
        <Divider sx={{ my: 1 }} />
        <StatLine label="Hit damage" value={breakdown.hitDamage.toFixed(1)} />
        <StatLine label="Mitigation" value={`${(breakdown.mitigationMult * 100).toFixed(1)}%`} />
        {breakdown.hitsToKill != null && (
          <StatLine label="Hits to kill" value={String(breakdown.hitsToKill)} />
        )}

        {breakdown.unsimulatedEffects && breakdown.unsimulatedEffects.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.75 }}>
              <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="overline" color="text.secondary">
                Not in single-target DPS
              </Typography>
            </Stack>
            {breakdown.unsimulatedEffects.map((fx) => (
              <Box key={fx.key} sx={{ mb: 0.75 }}>
                <Typography variant="caption" fontWeight={600}>
                  {fx.label}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {fx.reason}
                </Typography>
              </Box>
            ))}
          </>
        )}

        {combatChips.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="overline" color="text.secondary">
              Resolved combat stats
            </Typography>
            {combatChips.map((chip) => (
              <StatLine
                key={chip.label}
                label={chip.label}
                value={formatCharacterStatValue(chip.label as never, chip.value ?? 0)}
              />
            ))}
          </>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 0.75, alignItems: "flex-start" }}>
          <WarningAmberIcon sx={{ fontSize: 16, color: "text.secondary", mt: 0.2 }} />
          <Typography variant="caption" color="text.secondary">
            Quick estimate uses expected crit and proc rates. Event sim rolls variance, crits, and
            ability procs. Set nearby splash targets for explosion/blast AoE.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
