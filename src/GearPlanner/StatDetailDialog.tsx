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
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { ItemKey, SlotType } from "typed-adventureland";
import { StatContribution } from "../gameData/loadoutStats";
import { ItemInstanceLabel } from "../Shared/ItemInstanceLabel";
import { MathTeX, alignedTex } from "../Shared/MathTeX";
import {
  Combatant,
  DamageType,
  MitigationOptions,
  damageMultiplier,
  expectedHitBreakdown,
  mitigationBreakdown,
} from "./calculations";
import {
  ConditionDefenseDef,
  CurvePoint,
  InsightStat,
  MonsterConditionThreat,
  MonsterStatusSource,
  StatusResistStat,
  attributeSoftcapCurve,
  armorFromStr,
  fortitudeMultCurve,
  isDerivedInsightStat,
  isStatusResistStat,
  landChanceCurve,
  mitigationCurveByEffectiveDefense,
  mitigationCurveByPierce,
  monsterConditionThreats,
  pierceWaste,
  resistanceFromInt,
  statusChanceCurve,
  statusDurationCurve,
  statusResistInsight,
} from "./statInsights";

const STAT_DETAIL_FORMULA_ID = "stat-detail-formula";
const STAT_DETAIL_GRAPH_ID = "stat-detail-graph";

export type HitDirection = "youHit" | "theyHit";

type FormulaExample = {
  /** Human label outside the math, e.g. "You → Black Scorpion". */
  label: string;
  /** KaTeX `aligned` rows using `&=`. */
  lines: string[];
};

type FormulaLegendEntry = { symbol: string; meaning: string };

function FormulaLegendList({ legend }: { legend: FormulaLegendEntry[] }) {
  if (legend.length === 0) return null;
  return (
    <Box
      component="dl"
      sx={{
        m: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      {legend.map((entry) => (
        <Box
          key={entry.symbol}
          sx={{
            display: "grid",
            gridTemplateColumns: "5.5rem 1fr",
            columnGap: 1.5,
            alignItems: "baseline",
          }}
        >
          <Typography
            component="dt"
            variant="body2"
            sx={{
              m: 0,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {entry.symbol}
          </Typography>
          <Typography component="dd" variant="body2" color="text.secondary" sx={{ m: 0 }}>
            {entry.meaning}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * Default: plugged-in numbers. Optional Formula tab puts the equation
 * beside the legend. One dialog scroller only — no nested overflow.
 */
function FormulaExplain({
  context,
  symbolicLines,
  legend = [],
  examples,
  note,
}: {
  /** Which fight direction this dialog is teaching, e.g. "Attack · You → Black Scorpion". */
  context?: string;
  symbolicLines: string[];
  /** Symbol key shown under the equation (not inside KaTeX). */
  legend?: FormulaLegendEntry[];
  examples: FormulaExample[];
  note?: string;
}) {
  const [tab, setTab] = useState(0);

  useEffect(() => {
    setTab(0);
  }, [context]);

  return (
    <Box id={STAT_DETAIL_FORMULA_ID} sx={{ mb: 2 }}>
      {context ? (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {context}
        </Typography>
      ) : null}
      <Tabs
        value={tab}
        onChange={(_e, next: number) => setTab(next)}
        sx={{
          minHeight: 36,
          mb: 1.5,
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { minHeight: 36, textTransform: "none", py: 0.75 },
        }}
      >
        <Tab label="Your numbers" />
        <Tab label="Formula" />
      </Tabs>

      {tab === 0 ? (
        <Box>
          {examples.map((ex) => (
            <Box
              key={ex.label}
              sx={{
                px: 2,
                py: 1.75,
                borderRadius: 1,
                border: 1,
                borderColor: "divider",
                bgcolor: "action.hover",
                mb: examples.length > 1 ? 1.25 : 0,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                {ex.label}
              </Typography>
              <MathTeX tex={alignedTex(ex.lines)} />
            </Box>
          ))}
          {note ? (
            <Typography variant="body2" color="text.secondary" display="block" sx={{ mt: 1.25 }}>
              {note}
            </Typography>
          ) : null}
        </Box>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2.5,
            gridTemplateColumns: { xs: "1fr", sm: "minmax(0, 1.1fr) minmax(0, 1fr)" },
            alignItems: "start",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.75,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 1, display: "block", mb: 1 }}
            >
              Equation
            </Typography>
            <MathTeX tex={alignedTex(symbolicLines)} />
            {note ? (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
                {note}
              </Typography>
            ) : null}
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1.75,
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ letterSpacing: 1, display: "block", mb: 1 }}
            >
              Legend
            </Typography>
            <FormulaLegendList legend={legend} />
          </Box>
        </Box>
      )}
    </Box>
  );
}

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
              <TableCell sx={{ py: 0.75 }}>
                {row.kind === "gear" ? (
                  <ItemInstanceLabel
                    itemInfo={{
                      name: row.itemKey as ItemKey,
                      ...(row.level > 0 ? { level: row.level } : {}),
                    }}
                    size={28}
                    includeLevel={row.level > 0}
                    linkToDetail={false}
                    caption={row.slot}
                  />
                ) : row.kind === "set" ? (
                  `Set: ${row.setName}`
                ) : (
                  `Class ${row.table} (${row.wtype})`
                )}
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
  const padL = 36;
  const padR = 12;
  const padT = 10;
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
    <Box sx={{ width: "100%", maxWidth: width }}>
      {/* Horizontal axis titles — rotated SVG Y labels are hard to read. */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          mb: 0.5,
          gap: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {yLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {xLabel} →
        </Typography>
      </Box>
      <Box sx={{ lineHeight: 0 }}>
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${yLabel} vs ${xLabel}`}
        >
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
    </Box>
  );
}

function StatusResistBody({
  stat,
  value,
  conditions,
  monsterName,
  monsterStatus,
}: {
  stat: StatusResistStat;
  value: number;
  conditions?: Record<string, ConditionDefenseDef | undefined>;
  monsterName: string;
  monsterStatus?: MonsterStatusSource;
}) {
  const insight = statusResistInsight(stat, value, conditions);
  const threats = monsterConditionThreats(monsterStatus, conditions);
  const relevant =
    stat === "stresistance"
      ? threats.filter((t) => t.debuff)
      : threats.filter((t) => t.defenseStat === stat);
  const showChance = stat !== "stresistance";
  const showDuration =
    stat === "stresistance" || stat === "pnresistance" || stat === "firesistance";
  const chancePlugged = Math.max(0, Math.min(100, value));
  const durationPlugged = Math.max(0, (100 - value) / 100);
  const symbolicLines: string[] = [];
  const exampleLines: string[] = [];
  const legend: FormulaLegendEntry[] = [{ symbol: "r", meaning: stat }];
  if (showChance) {
    symbolicLines.push(`c &= \\min\\bigl(100,\\,\\max(0,\\,r)\\bigr)`);
    exampleLines.push(`c &= \\min\\bigl(100,\\,\\max(0,\\,${value})\\bigr) = ${chancePlugged}\\%`);
    legend.push({ symbol: "c", meaning: "chance resist %" });
  }
  if (showDuration) {
    symbolicLines.push(`\\delta &= \\max\\!\\left(0,\\,\\dfrac{100 - r}{100}\\right)`);
    exampleLines.push(
      `\\delta &= \\max\\!\\left(0,\\,\\dfrac{100 - ${value}}{100}\\right) = ${(
        durationPlugged * 100
      ).toFixed(1)}\\%`,
    );
    legend.push({ symbol: "δ", meaning: "duration / intensity remaining" });
  }

  const vsMonsterLead =
    relevant.length > 0
      ? `${monsterName} can apply: ${relevant
          .map((t: MonsterConditionThreat) => `${t.name} (${t.source})`)
          .join(", ")}. This resist matters for that fight.`
      : threats.length > 0
      ? `${monsterName}'s known status hooks don't use ${stat} for a chance roll${
          stat === "stresistance" ? " (and none look like timed debuffs here)." : "."
        }`
      : `No status hooks found on ${monsterName} in data — this resist may still matter vs other monsters or player skills.`;

  return (
    <Box>
      <Alert severity={relevant.length > 0 ? "info" : "success"} sx={{ mb: 1.5 }}>
        {vsMonsterLead}
      </Alert>
      <FormulaExplain
        symbolicLines={symbolicLines}
        legend={legend}
        examples={[{ label: `Current ${stat}`, lines: exampleLines }]}
        note={
          showChance
            ? "Server chance roll: random < resist / 100. Values above 100 are overcap for the roll."
            : "Applies to debuff duration scaling only (no chance resist)."
        }
      />
      {showChance && (
        <Box id={STAT_DETAIL_GRAPH_ID}>
          <Typography variant="subtitle2">c vs r (chance resist, cap 100%)</Typography>
          <FalloffChart
            points={statusChanceCurve()}
            markerX={value}
            xLabel={`r (${stat})`}
            yLabel="c (%)"
          />
        </Box>
      )}
      {showDuration && (
        <Box id={showChance ? undefined : STAT_DETAIL_GRAPH_ID}>
          <Typography variant="subtitle2" sx={{ mt: showChance ? 1 : 0 }}>
            δ vs r (duration / intensity remaining)
          </Typography>
          <FalloffChart
            points={statusDurationCurve()}
            markerX={value}
            xLabel={`r (${stat})`}
            yLabel="δ (%)"
          />
        </Box>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
        Current value: {value}
        {insight.overcap ? " (overcap — trim points above 100)" : ""}
      </Typography>
      {insight.hints.map((h) => (
        <Alert key={h} severity="warning" sx={{ mb: 1 }}>
          {h}
        </Alert>
      ))}
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
          All conditions using this defense:{" "}
          {insight.chanceConditions.map((c) => c.name).join(", ")}
        </Typography>
      )}
    </Box>
  );
}

function AttributeSoftcapBody({
  stat,
  value,
  player,
  monster,
  monsterName,
}: {
  stat: "str" | "int";
  value: number;
  player: Combatant;
  monster: Combatant;
  monsterName: string;
}) {
  const threshold = stat === "str" ? 160 : 180;
  const derived = stat === "str" ? "armor" : "resistance";
  const result = stat === "str" ? armorFromStr(value) : resistanceFromInt(value);
  const nextResult = stat === "str" ? armorFromStr(value + 1) : resistanceFromInt(value + 1);
  const curve = attributeSoftcapCurve({ kind: stat, from: 0, to: 280, steps: 70 });

  const attrSym = stat === "str" ? "S" : "I";
  const outSym = stat === "str" ? "A" : "R";

  // Chain into mitigation vs this monster (defense sheet: they hit you).
  const base = mitigationBreakdown(monster, player, { path: "basic" });
  const usesDerived =
    (stat === "str" && base.defenseStat === "armor") ||
    (stat === "int" && base.defenseStat === "resistance");
  const deltaDerived = nextResult - result;
  const playerPlus: Combatant =
    stat === "str"
      ? { ...player, armor: (player.armor ?? 0) + deltaDerived }
      : { ...player, resistance: (player.resistance ?? 0) + deltaDerived };
  const plus = mitigationBreakdown(monster, playerPlus, { path: "basic" });
  const marginalM = usesDerived ? (plus.multiplier - base.multiplier) * 100 : null;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {stat.toUpperCase()} softcaps into {derived}. Past {threshold}, each +1 {stat} adds only
        +0.25 {derived}
        {usesDerived && marginalM != null
          ? ` · vs ${monsterName}, +1 ${stat} ≈ ${marginalM >= 0 ? "+" : ""}${marginalM.toFixed(
              4,
            )}% m on their hits`
          : ` · ${monsterName}'s hits are ${base.damageType}, so ${derived} is not the active defense`}
        .
      </Alert>
      <FormulaExplain
        symbolicLines={[
          `${outSym} &= \\min(${attrSym}, ${threshold}) + \\max(0, ${attrSym} - ${threshold}) \\times 0.25`,
        ]}
        legend={[
          { symbol: attrSym, meaning: stat },
          { symbol: outSym, meaning: derived },
        ]}
        examples={[
          {
            label: `Current ${stat} = ${value}`,
            lines: [
              `${outSym} &= \\min(${value}, ${threshold}) + \\max(0, ${value} - ${threshold}) \\times 0.25 = ${result.toFixed(
                1,
              )}`,
            ],
          },
        ]}
        note={`Full value only up to the ${threshold} softcap; each point above adds 25%. Sheet ${derived} also includes gear — this curve is the attribute piece only.`}
      />
      <Typography variant="subtitle2" id={STAT_DETAIL_GRAPH_ID}>
        {outSym} vs {attrSym}
      </Typography>
      <FalloffChart
        points={curve}
        markerX={value}
        xLabel={`${attrSym} (${stat})`}
        yLabel={`${outSym} (${derived})`}
      />
    </Box>
  );
}

function LandChanceBody({
  stat,
  value,
  player,
  monster,
  monsterName,
  hitDirection,
  mitigationOptions,
}: {
  stat: "evasion" | "reflection";
  value: number;
  player: Combatant;
  monster: Combatant;
  monsterName: string;
  hitDirection: HitDirection;
  mitigationOptions?: MitigationOptions;
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

  const source = hitDirection === "youHit" ? player : monster;
  const target = hitDirection === "youHit" ? monster : player;
  const opts = mitigationOptions ?? {};
  const now = expectedHitBreakdown(source, target, opts);
  const gateApplies =
    now.mitigation.path === "basic" &&
    ((stat === "evasion" && now.mitigation.damageType === "physical") ||
      (stat === "reflection" && now.mitigation.damageType === "magical"));
  const bumpedTarget: Combatant =
    hitDirection === "youHit"
      ? {
          ...monster,
          [stat]: Math.min(100, (monster[stat] ?? 0) + 1),
        }
      : {
          ...player,
          [stat]: Math.min(100, (player[stat] ?? 0) + 1),
        };
  const plus = expectedHitBreakdown(source, bumpedTarget, opts);
  const landDelta = gateApplies ? (plus.landChance - now.landChance) * 100 : 0;
  const dmgDeltaPct =
    gateApplies && now.expected > 0
      ? ((plus.expected - now.expected) / now.expected) * 100
      : gateApplies
      ? (plus.landChance - now.landChance) * 100
      : 0;

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {against}. {land.toFixed(1)}% of hits deal damage
        {gateApplies
          ? ` · +1 ${stat}: ${landDelta >= 0 ? "+" : ""}${landDelta.toFixed(2)}% land ≈ ${
              dmgDeltaPct >= 0 ? "+" : ""
            }${dmgDeltaPct.toFixed(3)}% expected damage`
          : ` · not gating this path (${now.mitigation.damageType} / ${now.mitigation.path})`}
        .{stat === "reflection" ? " Reflection can also bounce a projectile back." : ""}
      </Alert>
      <FormulaExplain
        context={
          hitDirection === "youHit"
            ? `Attack · You → ${monsterName}`
            : `Defense · ${monsterName} → you`
        }
        symbolicLines={[
          `e &= \\min\\bigl(100,\\,\\max(0,\\,${stat === "evasion" ? "E" : "R"})\\bigr)`,
          `\\ell &= 100 - e`,
        ]}
        legend={[
          { symbol: stat === "evasion" ? "E" : "R", meaning: stat },
          { symbol: "e", meaning: "miss %" },
          { symbol: "ℓ", meaning: "land %" },
        ]}
        examples={[
          {
            label: `Current ${stat} = ${miss.toFixed(1)}%`,
            lines: [
              `e &= \\min\\bigl(100,\\,\\max(0,\\,${miss.toFixed(1)})\\bigr) = ${miss.toFixed(
                1,
              )}\\%`,
              `\\ell &= 100 - ${miss.toFixed(1)} = ${land.toFixed(1)}\\%`,
            ],
          },
        ]}
        note={`Miss when random × 100 < ${stat}. Expected hit damage scales by ℓ/100 (see expected hit).`}
      />
      <Typography variant="subtitle2" id={STAT_DETAIL_GRAPH_ID}>
        ℓ vs {stat === "evasion" ? "E" : "R"}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Orange = current. Y is expected % of hits that deal damage.
      </Typography>
      <FalloffChart
        points={landChanceCurve()}
        markerX={miss}
        xLabel={`${stat === "evasion" ? "E" : "R"} (${stat})`}
        yLabel="ℓ (%)"
      />
    </Box>
  );
}

function FortitudeBody({
  value,
  player,
  monster,
  monsterName,
  hitDirection,
  mitigationOptions,
}: {
  value: number;
  player: Combatant;
  monster: Combatant;
  monsterName: string;
  hitDirection: HitDirection;
  mitigationOptions?: MitigationOptions;
}) {
  const mult = damageMultiplier(value * 5);
  const nextMult = damageMultiplier((value + 1) * 5);
  const who =
    hitDirection === "youHit"
      ? `${monsterName}'s fortitude (for) vs your hits`
      : `your fortitude (for) vs ${monsterName}`;
  // Fortitude only multiplies when the attacker is a player (Attack direction).
  const applies = hitDirection === "youHit";
  const source = player;
  const target = monster;
  const opts = { ...(mitigationOptions ?? {}), attackerIsPlayer: true };
  const now = applies ? expectedHitBreakdown(source, target, opts) : null;
  const plusTarget = { ...monster, for: value + 1 };
  const plus = applies ? expectedHitBreakdown(source, plusTarget, opts) : null;
  const dmgDeltaPct =
    now && plus && now.expected > 0
      ? ((plus.expected - now.expected) / now.expected) * 100
      : applies
      ? (nextMult - mult) * 100
      : 0;

  return (
    <Box>
      <Alert severity={applies ? "info" : "success"} sx={{ mb: 1.5 }}>
        {who}. f = {(mult * 100).toFixed(1)}%
        {applies
          ? ` · +1 for → f ${(nextMult * 100).toFixed(1)}% ≈ ${
              dmgDeltaPct >= 0 ? "+" : ""
            }${dmgDeltaPct.toFixed(3)}% expected damage`
          : " · only scales player→monster hits, so it does not soften monster damage to you"}
        .
      </Alert>
      <FormulaExplain
        context={
          hitDirection === "youHit"
            ? `Attack · You → ${monsterName}`
            : `Defense · ${monsterName} → you`
        }
        symbolicLines={[
          `\\mathrm{f} &= \\mathrm{M}(\\mathrm{F} \\times 5)`,
          `\\mathrm{damage} &= \\mathrm{damage} \\times \\mathrm{f}`,
        ]}
        legend={[
          { symbol: "F", meaning: "fortitude (for)" },
          { symbol: "M", meaning: "damage_multiplier" },
          { symbol: "f", meaning: "fortitude mult" },
        ]}
        examples={[
          {
            label: `Current for = ${value}`,
            lines: [
              `\\mathrm{f} &= \\mathrm{M}(${value} \\times 5) = \\mathrm{M}(${(value * 5).toFixed(
                0,
              )}) = ${(mult * 100).toFixed(1)}\\%`,
            ],
          },
        ]}
        note="M is the same soft curve as armor/resist (clamped 5%–132%)."
      />
      <Typography variant="subtitle2" id={STAT_DETAIL_GRAPH_ID}>
        f vs F
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
        Orange = current F (for). f = M(F × 5).
      </Typography>
      <FalloffChart points={fortitudeMultCurve()} markerX={value} xLabel="F (for)" yLabel="f (%)" />
    </Box>
  );
}

function UnusedPierceBody({
  unusedStat,
  unusedValue,
  activeStat,
  activeValue,
  damageType,
}: {
  unusedStat: "apiercing" | "rpiercing";
  unusedValue: number;
  activeStat: "apiercing" | "rpiercing" | "none";
  activeValue: number;
  damageType: DamageType;
}) {
  return (
    <Box>
      <Alert severity="warning" sx={{ mb: 1.5 }}>
        {unusedStat} ({unusedValue}) does not pierce {damageType} hits.{" "}
        {activeStat === "none"
          ? "Pure damage ignores pierce entirely."
          : `This fight uses ${activeStat} (currently ${activeValue}).`}
      </Alert>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Stack {activeStat === "none" ? "something else" : activeStat} for this target, or switch
        damage type (weapon / heal path) if you want {unusedStat} to matter.
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        Open the active pierce row for the m vs p curve and hard-cap trim.
      </Typography>
    </Box>
  );
}

function ExpectedHitBody({
  focusStat,
  player,
  monster,
  monsterName,
  hitDirection,
  mitigationOptions,
}: {
  focusStat: "expectedHit" | "crit" | "critdamage" | "attack" | "frequency";
  player: Combatant;
  monster: Combatant;
  monsterName: string;
  hitDirection: HitDirection;
  mitigationOptions?: MitigationOptions;
}) {
  const youHitFocus = hitDirection === "youHit";
  const source = youHitFocus ? player : monster;
  const target = youHitFocus ? monster : player;
  const opts = mitigationOptions ?? {};
  const ev = expectedHitBreakdown(source, target, opts);
  const focusLabel = youHitFocus ? `You → ${monsterName}` : `${monsterName} → you`;
  const contextLabel = youHitFocus ? `Attack · ${focusLabel}` : `Defense · ${focusLabel}`;

  const lead =
    focusStat === "crit" || focusStat === "critdamage"
      ? `Crit EV is ×${ev.critEv.toFixed(3)} (p=${(ev.critChance * 100).toFixed(
          1,
        )}%, crit mult=${ev.critMult.toFixed(2)}). This is only one step of expected hit.`
      : focusStat === "frequency"
      ? `Theo DPS = expected hit × frequency = ${ev.expected.toFixed(1)} × ${ev.frequency.toFixed(
          2,
        )} = ${ev.theoDps.toFixed(1)}.`
      : focusStat === "attack"
      ? `Attack ${ev.attack} is the base before mitigation, fortitude, crit EV, and land chance.`
      : `Expected hit stacks mitigation → fortitude → crit EV → land chance. Raw roll range ignores crit/land.`;

  const A = "\\mathrm{A}";
  const m = "\\mathrm{m}";
  const f = "\\mathrm{f}";
  const c = "\\mathrm{c}";
  const ell = "\\ell";
  const E = "\\mathrm{E}";

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {lead}
      </Alert>
      <FormulaExplain
        context={contextLabel}
        symbolicLines={[
          `${E} &= ${A} \\times ${m} \\times ${f} \\times ${c} \\times ${ell}`,
          `\\mathrm{DPS} &= ${E} \\times \\mathrm{freq}`,
        ]}
        legend={[
          { symbol: "A", meaning: "attack" },
          { symbol: "m", meaning: "mitigation mult (armor/resist/pierce)" },
          { symbol: "f", meaning: "fortitude mult (player hits only)" },
          { symbol: "c", meaning: "crit EV = 1 + p(cmult−1)" },
          { symbol: "ℓ", meaning: "land chance (1 − miss)" },
          { symbol: "E", meaning: "expected hit" },
        ]}
        examples={[
          {
            label: focusLabel,
            lines: [
              `${E} &= ${ev.attack} \\times ${ev.mitigationMult.toFixed(
                3,
              )} \\times ${ev.fortitudeMult.toFixed(3)} \\times ${ev.critEv.toFixed(
                3,
              )} \\times ${ev.landChance.toFixed(3)} = ${ev.expected.toFixed(1)}`,
              `\\mathrm{DPS} &= ${ev.expected.toFixed(1)} \\times ${ev.frequency.toFixed(
                2,
              )} = ${ev.theoDps.toFixed(1)}`,
            ],
          },
        ]}
        note="Mitigation m alone is the 'damage multiplier' row. Crit uses live 2 + critdamage/100 on a successful roll."
      />
      <Typography variant="subtitle2" sx={{ mt: 1 }}>
        Stack for {focusLabel}
      </Typography>
      <Table size="small" sx={{ mb: 1 }}>
        <TableBody>
          <TableRow>
            <TableCell>attack (A)</TableCell>
            <TableCell align="right">{ev.attack}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>after mitigation (×m)</TableCell>
            <TableCell align="right">{ev.afterMitigation.toFixed(1)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>after fortitude (×f)</TableCell>
            <TableCell align="right">{ev.afterFortitude.toFixed(1)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>after crit EV (×c = {ev.critEv.toFixed(3)})</TableCell>
            <TableCell align="right">{ev.afterCrit.toFixed(1)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>expected hit (×ℓ = {(ev.landChance * 100).toFixed(1)}%)</TableCell>
            <TableCell align="right">{ev.expected.toFixed(1)}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>theo DPS</TableCell>
            <TableCell align="right">{ev.theoDps.toFixed(1)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
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
  const theyHit = mitigationBreakdown(monster, player, { path: "basic" });
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

  const focusWaste = hitDirection === "youHit" ? waste : theyWaste;
  const clickedPierce = stat === "apiercing" || stat === "rpiercing" ? stat : null;
  if (
    hitDirection === "youHit" &&
    clickedPierce &&
    waste.unusedPierceStat === clickedPierce &&
    waste.unusedPierce > 0
  ) {
    return (
      <UnusedPierceBody
        unusedStat={clickedPierce}
        unusedValue={waste.unusedPierce}
        activeStat={waste.activePierceStat}
        activeValue={waste.activePierce}
        damageType={waste.damageType}
      />
    );
  }
  if (
    hitDirection === "theyHit" &&
    clickedPierce &&
    theyWaste.unusedPierceStat === clickedPierce &&
    theyWaste.unusedPierce > 0
  ) {
    return (
      <UnusedPierceBody
        unusedStat={clickedPierce}
        unusedValue={theyWaste.unusedPierce}
        activeStat={theyWaste.activePierceStat}
        activeValue={theyWaste.activePierce}
        damageType={theyWaste.damageType}
      />
    );
  }

  const defenseForCurve = focus.defense;
  const pierceMarker = focus.pierce;
  const pierceStatLabel = focus.pierceStat === "none" ? "pierce" : focus.pierceStat;
  const defenseStatLabel = focus.defenseStat === "none" ? "defense" : focus.defenseStat;
  const hardCapPierce = focusWaste.pierceAtHardCap;
  const marginal = focusWaste.marginalMultFromPlusOne;

  const pierceCurve = mitigationCurveByPierce({
    defense: defenseForCurve,
    pierceTo: Math.max(hardCapPierce ?? 200, pierceMarker + 40, 80),
    skillPierce: hitDirection === "youHit" ? skillPierce : 0,
  });
  const effCurve = mitigationCurveByEffectiveDefense({});

  const entry: "pierce" | "defense" | "effectiveDefense" | "damageMultiplier" =
    stat === "apiercing" || stat === "rpiercing"
      ? "pierce"
      : stat === "armor" || stat === "resistance"
      ? "defense"
      : stat === "effectiveDefense"
      ? "effectiveDefense"
      : "damageMultiplier";

  const showPierceChart =
    focus.damageType !== "pure" &&
    (entry === "pierce" || entry === "damageMultiplier" || entry === "effectiveDefense");
  const showEffChart =
    entry === "defense" || entry === "effectiveDefense" || entry === "damageMultiplier";

  const focusHints = focusWaste.hints;
  const youHitFocus = hitDirection === "youHit";
  const focusPath = youHitFocus ? youHit.path : "basic";
  const focusSkillPierce = youHitFocus ? youHit.skillPierce : 0;

  const pathNote = youHitFocus
    ? focusPath === "heal"
      ? "Heal path: (def − pierce) / 2."
      : focusPath === "splash"
      ? "Splash: no pierce."
      : focusSkillPierce > 0
      ? `Basic + ${focusSkillPierce} skill pierce on info.`
      : "Basic: gear pierce counted twice."
    : "Defense uses basic attacks (gear pierce counted twice).";

  const De = "d_{\\mathrm{eff}}";
  const D = "\\mathrm{D}";
  const P = "\\mathrm{p}";
  const S = "\\mathrm{s}";
  const M = "\\mathrm{M}";
  const m = "\\mathrm{m}";
  const F = "\\mathrm{F}";

  const focusEffSymbolic =
    focusPath === "heal"
      ? `${De} &= \\dfrac{${D} - ${P}}{2}`
      : focusPath === "splash"
      ? `${De} &= ${D}`
      : focusSkillPierce > 0
      ? `${De} &= ${D} - 2${P} - ${S}`
      : `${De} &= ${D} - 2${P}`;

  const focusEffPlugged =
    focusPath === "heal"
      ? `${De} &= \\dfrac{${focus.defense} - ${focus.pierce}}{2} = ${focus.effectiveDefense.toFixed(
          1,
        )}`
      : focusPath === "splash"
      ? `${De} &= ${focus.defense} = ${focus.effectiveDefense.toFixed(1)}`
      : focusSkillPierce > 0
      ? `${De} &= ${focus.defense} - 2\\times ${
          focus.pierce
        } - ${focusSkillPierce} = ${focus.effectiveDefense.toFixed(1)}`
      : `${De} &= ${focus.defense} - 2\\times ${focus.pierce} = ${focus.effectiveDefense.toFixed(
          1,
        )}`;

  const symbolicLines = [focusEffSymbolic, `${m} &= ${M}(${De})`];
  if (youHitFocus && youHit.fortitudeMult !== 1) {
    symbolicLines.push(`${m}' &= ${m} \\times ${M}(${F} \\times 5)`);
  }

  const focusMultLine =
    youHitFocus && youHit.fortitudeMult !== 1
      ? `${m}' &= ${M}(${focus.effectiveDefense.toFixed(1)}) \\times ${M}(${F}\\times 5) = ${(
          focus.multiplier *
          youHit.fortitudeMult *
          100
        ).toFixed(1)}\\%`
      : `${m} &= ${M}(${focus.effectiveDefense.toFixed(1)}) = ${(focus.multiplier * 100).toFixed(
          1,
        )}\\%`;

  const pierceName = focus.pierceStat === "none" ? "pierce" : focus.pierceStat;
  const defName = focus.defenseStat === "none" ? "defense" : focus.defenseStat;
  const legend: FormulaLegendEntry[] = [
    {
      symbol: "D",
      meaning: youHitFocus ? `${monsterName}'s ${defName}` : `your ${defName}`,
    },
    {
      symbol: "p",
      meaning: youHitFocus ? `your ${pierceName}` : `${monsterName}'s ${pierceName}`,
    },
  ];
  if (youHitFocus && focusSkillPierce > 0) {
    legend.push({ symbol: "s", meaning: "skill pierce" });
  }
  legend.push(
    { symbol: "M", meaning: "damage_multiplier" },
    { symbol: "d_eff", meaning: "effective defense" },
    { symbol: "m", meaning: "damage mult" },
  );

  const focusLabel = youHitFocus ? `You → ${monsterName}` : `${monsterName} → you`;
  const contextLabel = youHitFocus ? `Attack · ${focusLabel}` : `Defense · ${focusLabel}`;

  // +1 defense → d_eff shift depends on path.
  const defenseDeltaEff = focusPath === "heal" ? 0.5 : focusPath === "splash" ? 1 : 1;
  const mPlusDefense =
    damageMultiplier(focus.effectiveDefense + defenseDeltaEff) - focus.multiplier;

  const lead =
    entry === "pierce"
      ? `Is more ${pierceStatLabel} worth it? Marginal +1 p: ${marginal >= 0 ? "+" : ""}${(
          marginal * 100
        ).toFixed(4)}% m vs this D (${defenseForCurve}).`
      : entry === "defense"
      ? `How much does ${defenseStatLabel} matter here? +1 D ≈ ${mPlusDefense >= 0 ? "+" : ""}${(
          mPlusDefense * 100
        ).toFixed(4)}% m (path ${focusPath}).`
      : entry === "effectiveDefense"
      ? `d_eff is what actually enters M. Current d_eff = ${focus.effectiveDefense.toFixed(
          1,
        )} → m = ${(focus.multiplier * 100).toFixed(1)}%.`
      : `Damage multiplier here is mitigation m only (${(focus.multiplier * 100).toFixed(
          1,
        )}%) — not crit EV or land chance. Open expected hit for the full stack.`;

  const pierceFirst = entry === "pierce";
  const effFirst = entry === "defense" || (entry === "effectiveDefense" && !showPierceChart);

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 1.5 }}>
        {lead}
      </Alert>
      <FormulaExplain
        context={contextLabel}
        symbolicLines={symbolicLines}
        legend={legend}
        examples={[
          {
            label: focusLabel,
            lines: [focusEffPlugged, focusMultLine],
          },
        ]}
        note={`${pathNote} M is soft-banded and clamped to 5%–132%.`}
      />
      {pierceFirst && showPierceChart && (
        <Box id={STAT_DETAIL_GRAPH_ID} sx={{ mb: 1 }}>
          <Typography variant="subtitle2">m vs p</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            D ({defenseStatLabel}) fixed at {defenseForCurve}. Orange = current p (
            {youHitFocus ? "your" : `${monsterName}'s`} {pierceStatLabel}).
            {hardCapPierce != null ? " Green dashed = m hard cap at 132%." : ""}
          </Typography>
          <FalloffChart
            points={pierceCurve}
            markerX={pierceMarker}
            capX={hardCapPierce ?? undefined}
            xLabel={`p (${pierceStatLabel})`}
            yLabel="m (%)"
          />
        </Box>
      )}
      {showEffChart && (
        <Box id={effFirst ? STAT_DETAIL_GRAPH_ID : undefined} sx={{ mb: 1 }}>
          <Typography variant="subtitle2">m vs d_eff</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            Orange = current d_eff for {focusLabel}
          </Typography>
          <FalloffChart
            points={effCurve}
            markerX={focus.effectiveDefense}
            xLabel="d_eff"
            yLabel="m (%)"
          />
        </Box>
      )}
      {!pierceFirst && showPierceChart && (
        <Box id={undefined} sx={{ mb: 1 }}>
          <Typography variant="subtitle2">m vs p</Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            D ({defenseStatLabel}) fixed at {defenseForCurve}. Orange = current p (
            {youHitFocus ? "your" : `${monsterName}'s`} {pierceStatLabel}).
            {hardCapPierce != null ? " Green dashed = m hard cap at 132%." : ""}
          </Typography>
          <FalloffChart
            points={pierceCurve}
            markerX={pierceMarker}
            capX={hardCapPierce ?? undefined}
            xLabel={`p (${pierceStatLabel})`}
            yLabel="m (%)"
          />
        </Box>
      )}
      {hardCapPierce != null && focus.damageType !== "pure" && entry !== "defense" && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
          m hard cap (132%) at p ≈ {hardCapPierce} vs this D. Marginal +1 p: +
          {(marginal * 100).toFixed(4)}% m.
          {focusWaste.piercePastHardCap > 0 ? (
            <> Trim ~{focusWaste.piercePastHardCap.toFixed(0)} p that does nothing past the cap.</>
          ) : null}
        </Typography>
      )}
      {focusHints.map((h) => (
        <Alert key={h.text} severity="warning" sx={{ mb: 1 }}>
          {h.text}
        </Alert>
      ))}
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
  /** Monster poisonous / abilities — status-resist vs-target lead. */
  monsterStatus?: MonsterStatusSource;
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
  monsterStatus,
  hitDirection = "youHit",
  contributions = [],
  mitigationOptions,
  onContributionSlot,
}: StatDetailDialogProps) {
  useEffect(() => {
    if (!open || !stat) return;
    const id = window.setTimeout(() => {
      document.getElementById(STAT_DETAIL_FORMULA_ID)?.scrollIntoView({ block: "nearest" });
    }, 0);
    return () => window.clearTimeout(id);
  }, [open, stat, hitDirection]);

  if (!stat) return null;

  const baseTitle =
    stat === "effectiveDefense"
      ? "Effective defense"
      : stat === "damageMultiplier"
      ? "Damage multiplier"
      : stat === "expectedHit"
      ? "Expected hit"
      : stat === "for"
      ? "Fortitude (for)"
      : stat;

  const directionSensitive =
    stat === "apiercing" ||
    stat === "rpiercing" ||
    stat === "armor" ||
    stat === "resistance" ||
    stat === "effectiveDefense" ||
    stat === "damageMultiplier" ||
    stat === "expectedHit" ||
    stat === "crit" ||
    stat === "critdamage" ||
    stat === "attack" ||
    stat === "frequency" ||
    stat === "for" ||
    stat === "evasion" ||
    stat === "reflection";

  const title = directionSensitive
    ? `${baseTitle} · ${hitDirection === "youHit" ? "Attack" : "Defense"}`
    : baseTitle;

  const sheetTotal = isDerivedInsightStat(stat)
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
      maxWidth="md"
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
          width: "100%",
          maxWidth: { xs: "100%", sm: 720, md: 860 },
          maxHeight: { xs: "92vh", sm: "88vh" },
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "background.paper",
          px: { xs: 2, sm: 3 },
          pt: 2.5,
          pb: 1.5,
          lineHeight: 1.35,
          flexShrink: 0,
        }}
      >
        {title}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{
          flex: "1 1 auto",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          bgcolor: "background.paper",
          backgroundImage: "none",
          px: { xs: 2, sm: 3 },
          py: 2,
        }}
      >
        {stat === "str" || stat === "int" ? (
          <AttributeSoftcapBody
            stat={stat}
            value={playerStats[stat] ?? 0}
            player={player}
            monster={monster}
            monsterName={monsterName}
          />
        ) : stat === "evasion" || stat === "reflection" ? (
          <LandChanceBody
            stat={stat}
            value={gateValue}
            player={player}
            monster={monster}
            monsterName={monsterName}
            hitDirection={hitDirection}
            mitigationOptions={mitigationOptions}
          />
        ) : stat === "for" ? (
          <FortitudeBody
            value={fortValue}
            player={player}
            monster={monster}
            monsterName={monsterName}
            hitDirection={hitDirection}
            mitigationOptions={mitigationOptions}
          />
        ) : isStatusResistStat(stat) ? (
          <StatusResistBody
            stat={stat}
            value={playerStats[stat] ?? 0}
            conditions={conditions}
            monsterName={monsterName}
            monsterStatus={monsterStatus}
          />
        ) : stat === "expectedHit" ||
          stat === "crit" ||
          stat === "critdamage" ||
          stat === "attack" ||
          stat === "frequency" ? (
          <ExpectedHitBody
            focusStat={stat}
            player={player}
            monster={monster}
            monsterName={monsterName}
            hitDirection={hitDirection}
            mitigationOptions={mitigationOptions}
          />
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
        {contributions.length > 0 && !isDerivedInsightStat(stat) && (
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
