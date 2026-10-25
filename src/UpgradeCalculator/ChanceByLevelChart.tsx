import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useMemo, useRef, useState } from "react";
import { ItemKey } from "typed-adventureland";

import {
  activeTechniqueSeries,
  buildUpgradeTechniqueChances,
  formatChancePct,
  PlannerContext,
  TECHNIQUE_CHANCE_META,
  TechniqueChanceId,
  UpgradePathStep,
} from "../calculators";

/** Theme-friendly categorical strokes (readable on dark + light). */
const SERIES_COLOR: Record<TechniqueChanceId, string> = {
  kit: "#8b93a7",
  prim: "#5b9fd4",
  statGrace: "#3dba9c",
  failstack: "#e0a35b",
  ograce: "#c47ae0",
  serverUgrace: "#e07a9a",
  plan: "#6ea8ff",
  lucky: "#f0c14a",
};

const CHART_H = 180;
const PAD = { top: 12, right: 12, bottom: 28, left: 36 };

function metaLabel(id: TechniqueChanceId): string {
  return TECHNIQUE_CHANCE_META.find((m) => m.id === id)?.label ?? id;
}

export function ChanceByLevelChart({
  ctx,
  itemKey,
  steps,
  luckySlot,
}: {
  ctx: PlannerContext;
  itemKey: ItemKey;
  steps: UpgradePathStep[];
  luckySlot: boolean;
}) {
  const points = useMemo(
    () =>
      buildUpgradeTechniqueChances({
        ctx,
        itemName: itemKey,
        steps,
        luckySlot,
      }),
    [ctx, itemKey, steps, luckySlot],
  );

  const available = useMemo(() => activeTechniqueSeries(points), [points]);

  const [hidden, setHidden] = useState<Partial<Record<TechniqueChanceId, boolean>>>({});
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = chartRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (typeof w === "number" && w > 0) setWidth(Math.floor(w));
    });
    ro.observe(el);
    setWidth(Math.floor(el.clientWidth));
    return () => ro.disconnect();
  }, []);

  const visible = useMemo(() => available.filter((id) => !hidden[id]), [available, hidden]);

  if (points.length < 1) return null;

  const plotW = Math.max(width, 1);
  const innerW = Math.max(1, plotW - PAD.left - PAD.right);
  const innerH = CHART_H - PAD.top - PAD.bottom;

  let yMin = 1;
  let yMax = 0;
  for (const p of points) {
    for (const id of visible) {
      const v = p.chances[id];
      if (v == null || !Number.isFinite(v)) continue;
      if (v < yMin) yMin = v;
      if (v > yMax) yMax = v;
    }
  }
  if (!(yMax > yMin)) {
    yMin = 0;
    yMax = 1;
  } else {
    const pad = Math.max(0.02, (yMax - yMin) * 0.08);
    yMin = Math.max(0, yMin - pad);
    yMax = Math.min(1, yMax + pad);
  }

  const xAt = (i: number) =>
    PAD.left + (points.length <= 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const yAt = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const toggle = (id: TechniqueChanceId) => {
    setHidden((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, width: "100%" }}>
      <Stack spacing={1.25} sx={{ width: "100%" }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Chance by level
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            Same scroll/offering as the plan; techniques layered on. Toggle series in the legend.
            Plan matches the in-game UI; Lucky EV does not.
          </Typography>
        </Box>

        <Stack direction="row" flexWrap="wrap" spacing={0.75} sx={{ gap: 0.75 }}>
          {available.map((id) => {
            const meta = TECHNIQUE_CHANCE_META.find((m) => m.id === id);
            const on = !hidden[id];
            return (
              <Chip
                key={id}
                size="small"
                label={meta?.label ?? id}
                title={meta?.hint}
                onClick={() => toggle(id)}
                variant={on ? "filled" : "outlined"}
                sx={{
                  height: 24,
                  fontSize: "0.7rem",
                  bgcolor: on ? undefined : "transparent",
                  borderColor: SERIES_COLOR[id],
                  color: on ? "common.white" : "text.secondary",
                  backgroundColor: on ? SERIES_COLOR[id] : undefined,
                  "& .MuiChip-label": { px: 1 },
                }}
              />
            );
          })}
        </Stack>

        <Box ref={chartRef} sx={{ width: "100%" }}>
          {plotW > 1 ? (
            <Box
              component="svg"
              viewBox={`0 0 ${plotW} ${CHART_H}`}
              sx={{ width: "100%", height: CHART_H, display: "block" }}
              role="img"
              aria-label="Upgrade chance by level for each technique"
            >
              {[0, 0.25, 0.5, 0.75, 1].map((t) => {
                const v = yMin + (yMax - yMin) * t;
                const y = yAt(v);
                return (
                  <g key={t}>
                    <line
                      x1={PAD.left}
                      x2={plotW - PAD.right}
                      y1={y}
                      y2={y}
                      stroke="currentColor"
                      strokeOpacity={0.12}
                      strokeWidth={1}
                    />
                    <text
                      x={PAD.left - 6}
                      y={y + 3}
                      textAnchor="end"
                      fill="currentColor"
                      opacity={0.55}
                      fontSize={10}
                      fontFamily="inherit"
                    >
                      {Math.round(v * 100)}%
                    </text>
                  </g>
                );
              })}

              {visible.map((id) => {
                const parts: string[] = [];
                for (let i = 0; i < points.length; i++) {
                  const v = points[i].chances[id];
                  if (v == null || !Number.isFinite(v)) continue;
                  const cmd = parts.length ? "L" : "M";
                  parts.push(`${cmd}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`);
                }
                if (!parts.length) return null;
                const dashed = id === "lucky" || id === "kit";
                return (
                  <path
                    key={id}
                    d={parts.join(" ")}
                    fill="none"
                    stroke={SERIES_COLOR[id]}
                    strokeWidth={id === "plan" ? 2.5 : 1.75}
                    strokeDasharray={dashed ? "4 3" : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              })}

              {points.map((p, i) => (
                <g key={`${p.fromLevel}-${p.toLevel}`}>
                  {visible.map((id) => {
                    const v = p.chances[id];
                    if (v == null || !Number.isFinite(v)) return null;
                    return (
                      <circle
                        key={id}
                        cx={xAt(i)}
                        cy={yAt(v)}
                        r={id === "plan" ? 3.2 : 2.4}
                        fill={SERIES_COLOR[id]}
                      >
                        <title>{`${metaLabel(id)} · +${p.fromLevel}→+${
                          p.toLevel
                        }: ${formatChancePct(v)}`}</title>
                      </circle>
                    );
                  })}
                  <text
                    x={xAt(i)}
                    y={CHART_H - 8}
                    textAnchor="middle"
                    fill="currentColor"
                    opacity={0.65}
                    fontSize={10}
                    fontFamily="inherit"
                  >
                    +{p.toLevel}
                  </text>
                </g>
              ))}
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Paper>
  );
}
