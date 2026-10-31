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
import { StatContribution } from "../gameData/loadoutStats";
import { Combatant, DamageType, mitigationBreakdown } from "./calculations";
import {
  ConditionDefenseDef,
  CurvePoint,
  InsightStat,
  StatusResistStat,
  isStatusResistStat,
  mitigationCurveByEffectiveDefense,
  mitigationCurveByPierce,
  pierceWaste,
  statusChanceCurve,
  statusDurationCurve,
  statusResistInsight,
} from "./statInsights";

function ContributionTable({
  rows,
  sheetTotal,
}: {
  rows: StatContribution[];
  sheetTotal?: number;
}) {
  if (rows.length === 0) return null;
  const gearSum = rows.reduce((sum, r) => sum + r.value, 0);
  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2">Where this number comes from</Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Equipped pieces (and set bonuses) that add this stat
        {sheetTotal != null ? ` · sheet total ${sheetTotal}` : ""}
        {sheetTotal != null && Math.abs(sheetTotal - gearSum) > 0.05
          ? ` · gear/set sum ${gearSum.toFixed(1)} (rest is class / attributes)`
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
              key={row.kind === "gear" ? `${row.slot}-${row.itemKey}` : `set-${row.setKey}`}
            >
              <TableCell>
                {row.kind === "gear"
                  ? `${row.itemName}${row.level > 0 ? ` +${row.level}` : ""} (${row.slot})`
                  : `Set: ${row.setName}`}
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
  xLabel,
  yLabel,
  width = 420,
  height = 180,
}: {
  points: CurvePoint[];
  markerX?: number;
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

export type HitDirection = "youHit" | "theyHit";

function MitigationBody({
  stat,
  player,
  monster,
  monsterName,
  hitDirection,
}: {
  stat: InsightStat;
  player: Combatant;
  monster: Combatant;
  monsterName: string;
  hitDirection: HitDirection;
}) {
  const youHit = mitigationBreakdown(player, monster);
  const theyHit = mitigationBreakdown(monster, player);
  const focus = hitDirection === "theyHit" ? theyHit : youHit;
  const waste = pierceWaste({
    damageType: player.damage_type as DamageType | undefined,
    apiercing: player.apiercing,
    rpiercing: player.rpiercing,
    monsterArmor: monster.armor,
    monsterResistance: monster.resistance,
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

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" paragraph>
        vs {monsterName} — focus {hitDirection === "youHit" ? "you → monster" : "monster → you"} (
        {focus.damageType}). Uses {pierceStatLabel} against {defenseStatLabel}.
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        You → monster: effective = {youHit.defense} − 2 × {youHit.pierce} ={" "}
        <strong>{youHit.effectiveDefense.toFixed(1)}</strong> →{" "}
        <strong>{(youHit.multiplier * 100).toFixed(1)}%</strong>
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        Monster → you: effective = {theyHit.defense} − 2 × {theyHit.pierce} ={" "}
        <strong>{theyHit.effectiveDefense.toFixed(1)}</strong> →{" "}
        <strong>{(theyHit.multiplier * 100).toFixed(1)}%</strong>
      </Typography>
      {focusHints.map((h) => (
        <Alert key={h} severity="warning" sx={{ mb: 1 }}>
          {h}
        </Alert>
      ))}
      {showPierceChart && (
        <>
          <Typography variant="subtitle2">
            Damage multiplier vs {hitDirection === "youHit" ? "your" : "their"} pierce
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            {defenseStatLabel} fixed at {defenseForCurve}. Orange = {pierceStatLabel}.
          </Typography>
          <FalloffChart
            points={pierceCurve}
            markerX={pierceMarker}
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
}: StatDetailDialogProps) {
  if (!stat) return null;

  const title =
    stat === "effectiveDefense"
      ? "Effective defense"
      : stat === "damageMultiplier"
      ? "Damage multiplier"
      : stat;

  const sheetTotal =
    stat === "effectiveDefense" || stat === "damageMultiplier" ? undefined : playerStats[stat];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent dividers>
        {isStatusResistStat(stat) ? (
          <StatusResistBody stat={stat} value={playerStats[stat] ?? 0} conditions={conditions} />
        ) : (
          <MitigationBody
            stat={stat}
            player={player}
            monster={monster}
            monsterName={monsterName}
            hitDirection={hitDirection}
          />
        )}
        {contributions.length > 0 && (
          <ContributionTable rows={contributions} sheetTotal={sheetTotal} />
        )}
      </DialogContent>
    </Dialog>
  );
}
