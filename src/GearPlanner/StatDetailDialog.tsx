import {
  Alert,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { SlotType } from "typed-adventureland";
import { StatContribution } from "../gameData/loadoutStats";
import {
  Combatant,
  DamageType,
  MitigationOptions,
  damageMultiplier,
  mitigationBreakdown,
} from "./calculations";
import {
  ConditionDefenseDef,
  CurvePoint,
  InsightStat,
  StatusResistStat,
  attributeSoftcapCurve,
  armorFromStr,
  fortitudeMultCurve,
  isStatusResistStat,
  landChanceCurve,
  mitigationCurveByEffectiveDefense,
  mitigationCurveByPierce,
  pierceWaste,
  resistanceFromInt,
  statusChanceCurve,
  statusDurationCurve,
  statusResistInsight,
} from "./statInsights";

export type HitDirection = "youHit" | "theyHit";

function ContributionTable({
  rows,
  sheetTotal,
  onContributionSlot,
}: {
  rows: StatContribution[];
  sheetTotal?: number;
  onContributionSlot?: (slot: SlotType) => void;
}) {
  if (rows.length === 0) return null;
  const gearSum = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Where this number comes from</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Equipped pieces, set bonuses, and class weapon-slot mods for this stat
        {sheetTotal != null ? ` · sheet total ${sheetTotal}` : ""}
        {sheetTotal != null && Math.abs(sheetTotal - gearSum) > 0.05
          ? ` · listed sum ${gearSum.toFixed(1)} (rest is class base / attributes)`
          : ""}
        .
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Source</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={
                row.kind === "gear"
                  ? `${row.slot}-${row.itemKey}`
                  : row.kind === "set"
                  ? `set-${row.setKey}`
                  : `slotMod-${row.table}-${row.wtype}`
              }
              hover={row.kind === "gear" && Boolean(onContributionSlot)}
              onClick={
                row.kind === "gear" && onContributionSlot
                  ? () => onContributionSlot(row.slot)
                  : undefined
              }
              sx={
                row.kind === "gear" && onContributionSlot
                  ? { cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }
                  : undefined
              }
            >
              <TableCell>
                {row.kind === "gear"
                  ? `${row.itemName}${row.level > 0 ? ` +${row.level}` : ""} (${row.slot})`
                  : row.kind === "set"
                  ? `Set: ${row.setName}`
                  : `Class ${row.table} (${row.wtype})`}
              </TableCell>
              <TableCell align="right">
                {row.value > 0 ? "+" : ""}
                {Number.isInteger(row.value) ? row.value : row.value.toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function FalloffChart({
  points,
  markerX,
  capX,
  xLabel,
  yLabel,
  width = 420,
  height = 180,
}: {
  points: CurvePoint[];
  markerX?: number;
  capX?: number;
  xLabel: string;
  yLabel: string;
  width?: number;
  height?: number;
}) {
  if (points.length < 2) return null;
  const padL = 40;
  const padR = 12;
  const padT = 12;
  const padB = 28;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys);
  const maxY = Math.max(...ys, 1);
  const sx = (x: number) => padL + ((x - minX) / (maxX - minX || 1)) * (width - padL - padR);
  const sy = (y: number) => padT + (1 - (y - minY) / (maxY - minY || 1)) * (height - padT - padB);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x)},${sy(p.y)}`).join(" ");
  const markerPoint =
    markerX == null
      ? null
      : points.reduce((best, p) =>
          Math.abs(p.x - markerX) < Math.abs(best.x - markerX) ? p : best,
        );

  return (
    <Box sx={{ overflowX: "auto" }}>
      <svg width={width} height={height} role="img" aria-label={`${yLabel} vs ${xLabel}`}>
        <line
          x1={padL}
          y1={height - padB}
          x2={width - padR}
          y2={height - padB}
          stroke="currentColor"
          opacity={0.3}
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={height - padB}
          stroke="currentColor"
          opacity={0.3}
        />
        <path d={d} fill="none" stroke="#1976d2" strokeWidth={2} />
        {capX != null && capX >= minX && capX <= maxX && (
          <line
            x1={sx(capX)}
            y1={padT}
            x2={sx(capX)}
            y2={height - padB}
            stroke="#2e7d32"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />
        )}
        {markerX != null && markerX >= minX && markerX <= maxX && markerPoint && (
          <>
            <line
              x1={sx(markerX)}
              y1={padT}
              x2={sx(markerX)}
              y2={height - padB}
              stroke="#ed6c02"
              strokeDasharray="4 3"
            />
            <circle cx={sx(markerX)} cy={sy(markerPoint.y)} r={4} fill="#ed6c02" />
          </>
        )}
        <text x={width / 2} y={height - 4} textAnchor="middle" fontSize={11} fill="currentColor">
          {xLabel}
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          fontSize={11}
          fill="currentColor"
          transform={`rotate(-90 12 ${height / 2})`}
        >
          {yLabel}
        </text>
        <text x={padL} y={height - padB + 14} fontSize={10} fill="currentColor" opacity={0.7}>
          {minX.toFixed(0)}
        </text>
        <text
          x={width - padR}
          y={height - padB + 14}
          textAnchor="end"
          fontSize={10}
          fill="currentColor"
          opacity={0.7}
        >
          {maxX.toFixed(0)}
        </text>
        <text
          x={padL - 4}
          y={padT + 4}
          textAnchor="end"
          fontSize={10}
          fill="currentColor"
          opacity={0.7}
        >
          {maxY.toFixed(0)}
        </text>
        <text
          x={padL - 4}
          y={height - padB}
          textAnchor="end"
          fontSize={10}
          fill="currentColor"
          opacity={0.7}
        >
          {minY.toFixed(0)}
        </text>
      </svg>
    </Box>
  );
}

function StatusResistBody({
  stat,
  value,
  conditions,
}: {
  stat: StatusResistStat;
  value: number;
  conditions?: Record<string, ConditionDefenseDef | undefined>;
}) {
  const insight = statusResistInsight(stat, value, conditions);
  const showChance = stat !== "stresistance";
  const showDuration =
    stat === "stresistance" || stat === "pnresistance" || stat === "firesistance";

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Current value: {value}
        {insight.overcap ? " (overcap)" : ""}
      </Typography>
      {insight.hints.map((h) => (
        <Alert key={h} severity="warning" sx={{ mb: 1 }}>
          {h}
        </Alert>
      ))}
      {showChance && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Chance resist (capped at 100%)
          </Typography>
          <FalloffChart
            points={statusChanceCurve()}
            markerX={value}
            xLabel={stat}
            yLabel="chance %"
          />
        </>
      )}
      {showDuration && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Duration / intensity remaining
          </Typography>
          <FalloffChart
            points={statusDurationCurve()}
            markerX={value}
            xLabel={stat}
            yLabel="remaining %"
          />
        </>
      )}
      <Divider sx={{ my: 1.5 }} />
      <List dense>
        {insight.notes.map((n) => (
          <ListItem key={n} disableGutters>
            <ListItemText primary={n} />
          </ListItem>
        ))}
      </List>
      {insight.chanceConditions.length > 0 && (
        <Typography variant="caption" color="text.secondary">
          Conditions using this defense: {insight.chanceConditions.map((c) => c.name).join(", ")}
        </Typography>
      )}
    </Box>
  );
}

function AttributeSoftcapBody({ stat, value }: { stat: "str" | "int"; value: number }) {
  const threshold = stat === "str" ? 160 : 180;
  const derivedLabel = stat === "str" ? "armor from STR" : "resistance from INT";
  const curve = attributeSoftcapCurve({ kind: stat, from: 0, to: 280, steps: 70 });

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Current {stat}: {value} → {derivedLabel}{" "}
        {stat === "str" ? armorFromStr(value).toFixed(1) : resistanceFromInt(value).toFixed(1)}.
        Full value only up to the {threshold} softcap; each point above adds 25%.
      </Typography>
      <Typography variant="subtitle2">
        {derivedLabel} vs {stat}
      </Typography>
      <FalloffChart points={curve} markerX={value} xLabel={stat} yLabel={derivedLabel} />
    </Box>
  );
}

function LandChanceBody({
  stat,
  value,
  monsterName,
  hitDirection,
}: {
  stat: "evasion" | "reflection";
  value: number;
  monsterName: string;
  hitDirection: HitDirection;
}) {
  const miss = Math.max(0, Math.min(100, value));
  const land = 100 - miss;
  const against =
    hitDirection === "youHit"
      ? stat === "evasion"
        ? `their evasion vs your physical hits`
        : `their reflection vs your magical hits`
      : stat === "evasion"
      ? `your evasion vs ${monsterName}'s physical hits`
      : `your reflection vs ${monsterName}'s magical hits`;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {against}. Current {stat}: {miss.toFixed(1)}% → land chance {land.toFixed(1)}%. Server roll:{" "}
        <code>random × 100 &lt; {stat}</code> fully negates the hit
        {stat === "reflection" ? " (and may bounce a projectile back)" : ""}.
      </Typography>
      <Typography variant="subtitle2">Land chance vs {stat}</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Orange = current {stat}. Y is expected % of hits that deal damage.
      </Typography>
      <FalloffChart points={landChanceCurve()} markerX={miss} xLabel={stat} yLabel="land %" />
    </Box>
  );
}

function FortitudeBody({
  value,
  monsterName,
  hitDirection,
}: {
  value: number;
  monsterName: string;
  hitDirection: HitDirection;
}) {
  const mult = damageMultiplier(value * 5);
  const who =
    hitDirection === "youHit"
      ? `${monsterName}'s fortitude (for) vs your hits`
      : `your fortitude (for) vs ${monsterName}`;

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {who}. Only applies when the attacker is a player. Current for {value} → mult{" "}
        {(mult * 100).toFixed(1)}% via <code>damage_multiplier(for × 5)</code> ={" "}
        <code>damage_multiplier({(value * 5).toFixed(0)})</code>.
      </Typography>
      <Typography variant="subtitle2">Damage mult vs fortitude (for)</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Orange = current for. Higher for softens player damage through the same mitigation curve.
      </Typography>
      <FalloffChart points={fortitudeMultCurve()} markerX={value} xLabel="for" yLabel="mult %" />
    </Box>
  );
}

function MitigationBody({
  stat,
  player,
  monster,
  monsterName,
  hitDirection,
  mitigationOptions,
}: {
  stat: InsightStat;
  player: Combatant;
  monster: Combatant;
  monsterName: string;
  hitDirection: HitDirection;
  mitigationOptions?: MitigationOptions;
}) {
  const opts = mitigationOptions ?? {};
  const youHit = mitigationBreakdown(player, monster, opts);
  const theyHit = mitigationBreakdown(monster, player, { path: opts.path ?? "basic" });
  const focus = hitDirection === "theyHit" ? theyHit : youHit;
  const skillPierce = opts.skillPierce ?? 0;
  const waste = pierceWaste({
    damageType: player.damage_type as DamageType | undefined,
    apiercing: player.apiercing,
    rpiercing: player.rpiercing,
    monsterArmor: monster.armor,
    monsterResistance: monster.resistance,
    skillPierce: hitDirection === "youHit" ? skillPierce : 0,
  });

  const theyWaste = pierceWaste({
    damageType: monster.damage_type as DamageType | undefined,
    apiercing: monster.apiercing,
    rpiercing: monster.rpiercing,
    monsterArmor: player.armor,
    monsterResistance: player.resistance,
  });

  const defenseForCurve = focus.defense;
  const pierceMarker = focus.pierce;
  const pierceStatLabel = focus.pierceStat === "none" ? "pierce" : focus.pierceStat;
  const defenseStatLabel = focus.defenseStat === "none" ? "defense" : focus.defenseStat;
  const hardCapPierce =
    hitDirection === "theyHit" ? theyWaste.pierceAtHardCap : waste.pierceAtHardCap;
  const marginal =
    hitDirection === "theyHit" ? theyWaste.marginalMultFromPlusOne : waste.marginalMultFromPlusOne;

  const pierceCurve = mitigationCurveByPierce({
    defense: defenseForCurve,
    pierceTo: Math.max(hardCapPierce ?? 200, pierceMarker + 40, 80),
    skillPierce: hitDirection === "youHit" ? skillPierce : 0,
  });
  const effCurve = mitigationCurveByEffectiveDefense({});

  const showPierceChart =
    focus.damageType !== "pure" &&
    (stat === "apiercing" ||
      stat === "rpiercing" ||
      stat === "damageMultiplier" ||
      stat === "effectiveDefense");

  const showEffChart =
    stat === "armor" ||
    stat === "resistance" ||
    stat === "effectiveDefense" ||
    stat === "damageMultiplier";

  const focusHints = hitDirection === "youHit" ? waste.hints : theyWaste.hints;
  const focusWaste = hitDirection === "youHit" ? waste : theyWaste;

  const pathNote =
    opts.path === "heal"
      ? "Heal path: (def − pierce) / 2."
      : opts.path === "splash"
      ? "Splash: no pierce."
      : skillPierce > 0
      ? `Basic + ${skillPierce} skill pierce on info.`
      : "Basic: gear pierce counted twice.";

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        vs {monsterName} — focus {hitDirection === "youHit" ? "you → monster" : "monster → you"} (
        {focus.damageType}). Uses {pierceStatLabel} against {defenseStatLabel}. {pathNote}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        You → monster: effective = {youHit.defense}
        {youHit.path === "heal"
          ? ` − ${youHit.pierce} → /2`
          : youHit.path === "splash"
          ? ""
          : ` − 2 × ${youHit.pierce}${youHit.skillPierce ? ` − ${youHit.skillPierce}` : ""}`}{" "}
        = <strong>{youHit.effectiveDefense.toFixed(1)}</strong> →{" "}
        <strong>{(youHit.multiplier * 100).toFixed(1)}%</strong>
        {youHit.fortitudeMult !== 1 ? ` × fort ${(youHit.fortitudeMult * 100).toFixed(1)}%` : ""}
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Monster → you: effective = {theyHit.defense} − 2 × {theyHit.pierce} ={" "}
        <strong>{theyHit.effectiveDefense.toFixed(1)}</strong> →{" "}
        <strong>{(theyHit.multiplier * 100).toFixed(1)}%</strong>
        {theyHit.missChance > 0
          ? ` · ${theyHit.landChance * 100}% land (${theyHit.missChance}% miss)`
          : ""}
      </Typography>
      {focusHints.map((h) => (
        <Alert key={h.text} severity="warning" sx={{ mb: 1 }}>
          {h.text}
        </Alert>
      ))}
      {showPierceChart && (
        <>
          <Typography variant="subtitle2">
            Damage multiplier vs {hitDirection === "youHit" ? "your" : "their"} pierce
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            {defenseStatLabel} fixed at {defenseForCurve}. Orange = {pierceStatLabel}.
            {hardCapPierce != null ? " Green dashed = 132% mult cap." : ""}
          </Typography>
          <FalloffChart
            points={pierceCurve}
            markerX={pierceMarker}
            capX={hardCapPierce ?? undefined}
            xLabel={pierceStatLabel}
            yLabel="mult %"
          />
        </>
      )}
      {showEffChart && (
        <>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            Damage multiplier vs effective defense
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Orange marker: {hitDirection === "youHit" ? "you → monster" : "monster → you"}
          </Typography>
          <FalloffChart
            points={effCurve}
            markerX={focus.effectiveDefense}
            xLabel="effective defense"
            yLabel="mult %"
          />
        </>
      )}
      {hardCapPierce != null && focus.damageType !== "pure" && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Hard cap (132% mult) at ~{hardCapPierce} {pierceStatLabel} vs this defense. Marginal +1
          pierce: +{(marginal * 100).toFixed(4)}% mult.
          {focusWaste.piercePastHardCap > 0 ? (
            <>
              {" "}
              Trim ~{focusWaste.piercePastHardCap.toFixed(0)} {pierceStatLabel} that does nothing.
            </>
          ) : null}
        </Typography>
      )}
    </Box>
  );
}

export type StatDetailDialogProps = {
  open: boolean;
  onClose: () => void;
  stat: InsightStat | null;
  player: Combatant;
  monster: Combatant;
  monsterName: string;
  playerStats: Record<string, number | undefined>;
  conditions?: Record<string, ConditionDefenseDef | undefined>;
  hitDirection?: HitDirection;
  contributions?: StatContribution[];
  mitigationOptions?: MitigationOptions;
  onContributionSlot?: (slot: SlotType) => void;
};

export function StatDetailDialog({
  open,
  onClose,
  stat,
  player,
  monster,
  monsterName,
  playerStats,
  conditions,
  hitDirection = "youHit",
  contributions = [],
  mitigationOptions,
  onContributionSlot,
}: StatDetailDialogProps) {
  if (!stat) return null;

  const title =
    stat === "effectiveDefense"
      ? "Effective defense"
      : stat === "damageMultiplier"
      ? "Damage multiplier"
      : stat === "for"
      ? "Fortitude (for)"
      : stat;

  const sheetTotal =
    stat === "effectiveDefense" || stat === "damageMultiplier"
      ? undefined
      : stat === "for"
      ? hitDirection === "youHit"
        ? monster.for
        : player.for
      : stat === "evasion"
      ? hitDirection === "youHit"
        ? monster.evasion
        : player.evasion
      : stat === "reflection"
      ? hitDirection === "youHit"
        ? monster.reflection
        : player.reflection
      : playerStats[stat];

  const gateValue =
    stat === "evasion"
      ? hitDirection === "youHit"
        ? monster.evasion ?? 0
        : player.evasion ?? 0
      : stat === "reflection"
      ? hitDirection === "youHit"
        ? monster.reflection ?? 0
        : player.reflection ?? 0
      : 0;

  const fortValue = hitDirection === "youHit" ? monster.for ?? 0 : player.for ?? 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      // Skip fade so backdrop/paper never sit mid-opacity while the graph is open.
      transitionDuration={0}
      BackdropProps={{
        sx: { bgcolor: "rgba(0, 0, 0, 0.75)", opacity: "1 !important" },
        transitionDuration: 0,
      }}
      PaperProps={{
        elevation: 12,
        sx: {
          bgcolor: "background.paper",
          backgroundImage: "none",
          opacity: 1,
        },
      }}
    >
      <DialogTitle sx={{ bgcolor: "background.paper" }}>{title}</DialogTitle>
      <DialogContent
        dividers
        sx={{
          maxHeight: { xs: "80vh", sm: "70vh" },
          overflow: "auto",
          bgcolor: "background.paper",
          backgroundImage: "none",
        }}
      >
        {stat === "str" || stat === "int" ? (
          <AttributeSoftcapBody stat={stat} value={playerStats[stat] ?? 0} />
        ) : stat === "evasion" || stat === "reflection" ? (
          <LandChanceBody
            stat={stat}
            value={gateValue}
            monsterName={monsterName}
            hitDirection={hitDirection}
          />
        ) : stat === "for" ? (
          <FortitudeBody value={fortValue} monsterName={monsterName} hitDirection={hitDirection} />
        ) : isStatusResistStat(stat) ? (
          <StatusResistBody stat={stat} value={playerStats[stat] ?? 0} conditions={conditions} />
        ) : (
          <MitigationBody
            stat={stat}
            player={player}
            monster={monster}
            monsterName={monsterName}
            hitDirection={hitDirection}
            mitigationOptions={mitigationOptions}
          />
        )}
        {contributions.length > 0 && (
          <ContributionTable
            rows={contributions}
            sheetTotal={typeof sheetTotal === "number" ? sheetTotal : undefined}
            onContributionSlot={onContributionSlot}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
